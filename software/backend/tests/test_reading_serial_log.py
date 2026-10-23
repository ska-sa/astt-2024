"""Check optional serial diagnostics using isolated SQLite databases."""

import os
from pathlib import Path
import sqlite3
import tempfile
from typing import Any
import unittest
from unittest.mock import patch

from pydantic import ValidationError
from classes import Database
from classes.reading import CreateReading, Reading
from endpoints.readings import (
    delete_reading, get_latest_reading, get_reading, get_readings,
    get_readings_in_range, post_reading, update_reading
)


class ReadingSerialLogTests(unittest.TestCase):
    """Exercise new and legacy reading payloads without touching persisted data."""

    def setUp(self) -> None:
        """Create an empty test database directory for each check."""
        self.previous_directory = Path.cwd()
        self.temporary_directory = tempfile.TemporaryDirectory()
        os.chdir(self.temporary_directory.name)
        Path('databases').mkdir()
        self.environment = patch.dict(os.environ, {'ENV': 'testing'})
        self.environment.start()

    def tearDown(self) -> None:
        """Restore the working directory and discard test-only storage."""
        self.environment.stop()
        os.chdir(self.previous_directory)
        self.temporary_directory.cleanup()

    def legacy_payload(self) -> dict[str, Any]:
        """Return the complete reading body used before serial_log existed."""
        return {
            'telescope_id': 7, 'azimuth_angle': 123.45, 'elevation_angle': 12.5,
            'latitude': -33.94, 'longitude': 18.47, 'altitude': 6.0,
            'gyroscope_x': 0.1, 'gyroscope_y': 0.2, 'gyroscope_z': 0.3,
            'acceleration_x': 1.1, 'acceleration_y': 2.2, 'acceleration_z': 9.8,
            'magnetic_field_x': 0.000012, 'magnetic_field_y': 0.000023,
            'magnetic_field_z': 0.000034, 'health_status': 'OK',
            'movement_status': 'IDLE'
        }

    def assert_read_paths(self, reading: Reading) -> None:
        """Check each existing read path preserves the entire model."""
        self.assertEqual(get_reading(reading.id), reading)
        self.assertEqual(get_readings(), [reading])
        self.assertEqual(get_latest_reading(reading.telescope_id), reading)
        start = reading.created_at.strftime('%Y-%m-%d 00:00:00')
        end = reading.created_at.strftime('%Y-%m-%d 23:59:59')
        self.assertEqual(get_readings_in_range(reading.telescope_id, start, end), [reading])

    def test_legacy_migration_preserves_values_and_defaults_log_to_null(self) -> None:
        """A repeated ALTER migration must retain IDs, timestamps and sensor values."""
        payload = self.legacy_payload()
        with sqlite3.connect('databases/testing.db') as connection:
            connection.execute("""
                CREATE TABLE reading (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telescope_id INTEGER, azimuth_angle REAL, elevation_angle REAL,
                    latitude REAL, longitude REAL, altitude REAL,
                    gyroscope_x REAL, gyroscope_y REAL, gyroscope_z REAL,
                    acceleration_x REAL, acceleration_y REAL, acceleration_z REAL,
                    magnetic_field_x REAL, magnetic_field_y REAL, magnetic_field_z REAL,
                    health_status TEXT, movement_status TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            columns = ', '.join(payload)
            placeholders = ', '.join('?' for _ in payload)
            connection.execute(
                f"INSERT INTO reading (id, {columns}, created_at) VALUES (42, {placeholders}, ?)",
                [*payload.values(), '2026-10-22 10:00:00']
            )
            original = connection.execute('SELECT * FROM reading').fetchone()

        database = Database()
        database.create_tables()
        migrated = database.cur.execute('SELECT * FROM reading').fetchone()
        columns = database.cur.execute('PRAGMA table_info(reading)').fetchall()
        database.conn.close()
        self.assertEqual(migrated[:-1], original)
        self.assertIsNone(migrated[-1])
        self.assertEqual([column[1] for column in columns].count('serial_log'), 1)
        reading = get_reading(42)
        self.assertEqual(reading.model_dump(exclude={'id', 'created_at', 'serial_log'}), payload)
        self.assertEqual(str(reading.created_at), '2026-10-22 10:00:00')
        self.assertIsNone(reading.serial_log)
        self.assert_read_paths(reading)

    def test_log_round_trips_create_update_read_history_and_delete(self) -> None:
        """Every existing route returns the same diagnostic that was stored."""
        payload = self.legacy_payload()
        payload['serial_log'] = 'enc 170.0 az 200.0 target 210.0 pwm 154 MOVING'
        reading = post_reading(CreateReading.model_validate(payload))
        self.assertEqual(reading.serial_log, payload['serial_log'])
        self.assert_read_paths(reading)
        updated_payload = reading.model_dump(mode='json')
        updated_payload['serial_log'] = 'enc 180.0 az 210.0 target 210.0 pwm 0 AZ POINT COMPLETE'
        updated = update_reading(reading.id, Reading.model_validate(updated_payload))
        self.assertEqual(updated.serial_log, updated_payload['serial_log'])
        self.assert_read_paths(updated)
        self.assertEqual(delete_reading(reading.id), updated)
        self.assertEqual(get_readings(), [])

    def test_legacy_and_explicit_null_post_payloads_remain_compatible(self) -> None:
        """Default None must not break the post-insert lookup via SQL '= NULL'."""
        payload = self.legacy_payload()
        omitted = post_reading(CreateReading.model_validate(payload))
        explicit_null = post_reading(CreateReading.model_validate({**payload, 'serial_log': None}))
        self.assertIsNone(omitted.serial_log)
        self.assertIsNone(explicit_null.serial_log)
        self.assertNotEqual(omitted.id, explicit_null.id)
        self.assertEqual(get_latest_reading(7), explicit_null)
        self.assertEqual(len(get_readings()), 2)

    def test_old_update_payload_and_explicit_null_log_work(self) -> None:
        """Older PUT bodies remain valid and an explicit null can clear a log."""
        reading = post_reading(CreateReading.model_validate(self.legacy_payload()))
        legacy_update = reading.model_dump(mode='json', exclude={'serial_log'})
        legacy_update['azimuth_angle'] = 150.0
        updated = update_reading(reading.id, Reading.model_validate(legacy_update))
        self.assertEqual(updated.azimuth_angle, 150.0)
        self.assertIsNone(updated.serial_log)
        updated.serial_log = 'temporary diagnostic'
        saved = update_reading(reading.id, updated)
        self.assertEqual(saved.serial_log, 'temporary diagnostic')
        cleared = update_reading(reading.id, saved.model_copy(update={'serial_log': None}))
        self.assertIsNone(cleared.serial_log)
        self.assert_read_paths(cleared)

    def test_serial_log_length_is_limited_on_create_and_update_models(self) -> None:
        """Accept the stated bound and reject oversized diagnostics before storage."""
        payload = {**self.legacy_payload(), 'serial_log': 'x' * 2048}
        reading = post_reading(CreateReading.model_validate(payload))
        self.assertEqual(reading.serial_log, payload['serial_log'])
        self.assert_read_paths(reading)
        with self.assertRaises(ValidationError):
            CreateReading.model_validate({**payload, 'serial_log': 'x' * 2049})
        with self.assertRaises(ValidationError):
            Reading.model_validate({**reading.model_dump(), 'serial_log': 'x' * 2049})
        self.assertEqual(len(get_readings()), 1)


if __name__ == '__main__':
    unittest.main()
