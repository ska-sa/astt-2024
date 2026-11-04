"""Track command history and migrations, isolated from live telescope commands."""

import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from classes.database import Database
from classes.command import CreateCommand, PointCommand, TrackCommand
from classes.source import CreateSource
from endpoints.commands import get_commands, get_latest_command, post_command


class TrackCommandTests(unittest.TestCase):
    """Exercise the real endpoint functions with a disposable SQLite database."""

    def setUp(self) -> None:
        self.previous_directory = Path.cwd()
        self.temporary_directory = tempfile.TemporaryDirectory()
        os.chdir(self.temporary_directory.name)
        Path('databases').mkdir()
        self.environment = patch.dict(os.environ, {'ENV': 'testing'})
        self.environment.start()

    def tearDown(self) -> None:
        self.environment.stop()
        os.chdir(self.previous_directory)
        self.temporary_directory.cleanup()

    def track_command(self, telescope_id: int = 7, amplitude: float = 23.259236) -> CreateCommand:
        """Use the pasted script's values to reproduce the storage failure."""
        return CreateCommand(user_id=1, telescope_id=telescope_id, command_type='track',
                             track=TrackCommand(source=CreateSource(
                                 name='Sun', m_1=0.781343, m_2=0.778744,
                                 c_1=18.961506, c_2=19.141818, T_ra=14.9487,
                                 A=amplitude, T_dec=4.774648, phi=-1.376046, D=0.378150)))

    def test_repeated_source_creates_new_command_ids(self) -> None:
        first = post_command(self.track_command())
        second = post_command(self.track_command())
        self.assertGreater(second.id, first.id)
        self.assertEqual(second.track, first.track)
        self.assertIsNone(second.point)
        self.assertEqual(get_latest_command(7), second)
        self.assertEqual(len(get_commands()), 2)

    def test_same_source_with_changed_parameters_or_telescope(self) -> None:
        first = post_command(self.track_command())
        changed = post_command(self.track_command(amplitude=23.5))
        other = post_command(self.track_command(telescope_id=8))
        self.assertEqual(changed.track.source.A, 23.5)
        self.assertEqual(first.track.source.A, 23.259236)
        self.assertEqual(get_latest_command(7), changed)
        self.assertEqual(get_latest_command(8), other)
        self.assertEqual(len({first.id, changed.id, other.id}), 3)

    def test_insert_failure_returns_explicit_error(self) -> None:
        post_command(self.track_command())
        with patch.object(Database, 'insert', return_value=(False, [])):
            with self.assertRaises(HTTPException) as error:
                post_command(self.track_command())
        self.assertEqual(error.exception.status_code, 500)
        self.assertEqual(error.exception.detail, 'Failed to store command.')
        self.assertEqual(len(get_commands()), 1)

    def test_point_still_gets_a_new_id_each_time(self) -> None:
        command = CreateCommand(user_id=1, telescope_id=7, command_type='point',
                                point=PointCommand(target_az_angle=30, target_el_angle=45))
        first = post_command(command)
        second = post_command(command)
        self.assertGreater(second.id, first.id)
        self.assertEqual(second.point, first.point)
        self.assertIsNone(second.track)

    def test_migration_preserves_rows_sequence_and_source_uniqueness(self) -> None:
        with sqlite3.connect('databases/testing.db') as connection:
            connection.executescript("""
                CREATE TABLE command (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL, telescope_id INTEGER NOT NULL,
                    command_type VARCHAR(50) NOT NULL,
                    target_az_angle DOUBLE DEFAULT NULL, target_el_angle DOUBLE DEFAULT NULL,
                    name TEXT UNIQUE DEFAULT NULL,
                    m_1 REAL, m_2 REAL, c_1 REAL, c_2 REAL, T_ra REAL,
                    A REAL, phi REAL, D REAL, T_dec REAL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO command VALUES (
                    12, 1, 7, 'track', NULL, NULL, 'Sun',
                    0.781343, 0.778744, 18.961506, 19.141818, 14.9487,
                    23.259236, -1.376046, 0.378150, 4.774648, '2026-11-04 10:00:00'
                );
                INSERT INTO command (id, user_id, telescope_id, command_type,
                                     target_az_angle, target_el_angle)
                VALUES (13, 1, 7, 'point', 30, 45), (99, 1, 7, 'point', 0, 0);
                DELETE FROM command WHERE id = 99;
            """)
            before = connection.execute('SELECT * FROM command ORDER BY id').fetchall()
        database = Database()
        database.create_tables()  # Reopening/migrating must be idempotent.
        self.assertEqual(database.cur.execute('SELECT * FROM command ORDER BY id').fetchall(), before)
        source = self.track_command().track.source.model_dump()
        self.assertTrue(database.insert('source', source)[0])
        self.assertFalse(database.insert('source', source)[0])
        database.conn.close()
        new_command = post_command(self.track_command())
        self.assertGreater(new_command.id, 99)
        self.assertEqual(get_latest_command(7), new_command)

    def test_legacy_point_table_migration(self) -> None:
        with sqlite3.connect('databases/testing.db') as connection:
            connection.executescript("""
                CREATE TABLE command (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, telescope_id INTEGER,
                    target_az_angle DOUBLE, target_el_angle DOUBLE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO command VALUES (4, 1, 7, 30, 45, '2026-11-04 10:00:00');
            """)
        legacy = get_latest_command(7)
        self.assertEqual(legacy.id, 4)
        self.assertEqual(legacy.command_type, 'point')
        self.assertEqual(legacy.point.target_el_angle, 45)
        first = post_command(self.track_command())
        second = post_command(self.track_command())
        self.assertGreater(second.id, first.id)


if __name__ == '__main__':
    unittest.main()
