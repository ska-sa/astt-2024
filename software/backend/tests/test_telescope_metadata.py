"""Exercise telescope metadata and Point limits using isolated SQLite files."""

import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from classes import Database
from classes.command import CreateCommand, PointCommand
from classes.telescope import CreateTelescope, Telescope
from endpoints.commands import get_commands, post_command, update_command
from endpoints.telescopes import (
    delete_telescope, get_telescope, get_telescopes, post_telescope, update_telescope
)


class TelescopeMetadataTests(unittest.TestCase):
    """Keep migrations and validation checks away from the real databases."""

    def setUp(self) -> None:
        """Run each test in a fresh testing database directory."""
        self.previous_directory = Path.cwd()
        self.temporary_directory = tempfile.TemporaryDirectory()
        os.chdir(self.temporary_directory.name)
        Path('databases').mkdir()
        self.environment = patch.dict(os.environ, {'ENV': 'testing'})
        self.environment.start()

    def tearDown(self) -> None:
        """Restore the working directory after using temporary data."""
        self.environment.stop()
        os.chdir(self.previous_directory)
        self.temporary_directory.cleanup()

    def create_configured_telescope(self) -> Telescope:
        """Register the conservative encoder-only test window."""
        return post_telescope(CreateTelescope(
            name='Test telescope',
            health_status='OK',
            metadata={
                'az_encoder_min': 137.8,
                'az_encoder_max': 209.7,
                'az_encoder_offset': 0.0,
                'az_range_temporary': True,
                'mount': {'name': 'breadboard'}
            }
        ))

    def point_command(self, telescope_id: int, azimuth: float) -> CreateCommand:
        """Build a Point command without accessing hardware."""
        return CreateCommand(
            user_id=1,
            telescope_id=telescope_id,
            command_type='point',
            point=PointCommand(target_az_angle=azimuth, target_el_angle=45.0)
        )

    def test_migration_preserves_old_records_and_is_repeatable(self) -> None:
        """Add metadata to a legacy table without changing IDs or timestamps."""
        with sqlite3.connect('databases/testing.db') as connection:
            connection.executescript("""
                CREATE TABLE telescope (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE,
                    health_status TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO telescope VALUES (7, 'Existing telescope', 'OK', '2026-10-16 12:00:00');
            """)

        database = Database()
        database.create_tables()
        row = database.cur.execute('SELECT * FROM telescope WHERE id = 7').fetchone()
        database.conn.close()
        self.assertEqual(row, (7, 'Existing telescope', 'OK', '2026-10-16 12:00:00', '{}'))
        self.assertEqual(get_telescope(7).metadata, {})

    def test_telescope_crud_round_trips_metadata(self) -> None:
        """Existing CRUD operations preserve JSON values and unrelated keys."""
        telescope = self.create_configured_telescope()
        self.assertEqual(get_telescope(telescope.id).metadata, telescope.metadata)
        self.assertEqual(get_telescopes()[0].metadata, telescope.metadata)
        payload = telescope.model_dump(mode='json')
        payload['metadata']['az_encoder_max'] = 210.0
        updated = update_telescope(telescope.id, Telescope.model_validate(payload))
        self.assertEqual(updated.metadata['az_encoder_max'], 210.0)
        self.assertEqual(updated.metadata['mount'], {'name': 'breadboard'})
        self.assertEqual(updated.created_at, telescope.created_at)
        self.assertEqual(delete_telescope(telescope.id).metadata, updated.metadata)
        self.assertIsNone(get_telescope(telescope.id))

    def test_legacy_update_keeps_existing_metadata(self) -> None:
        """An older client omitting metadata must not erase calibration."""
        telescope = self.create_configured_telescope()
        payload = telescope.model_dump(mode='json', exclude={'metadata'})
        payload['name'] = 'Renamed telescope'
        updated = update_telescope(telescope.id, Telescope.model_validate(payload))
        self.assertEqual(updated.metadata, telescope.metadata)

    def test_unconfigured_telescope_keeps_previous_point_behavior(self) -> None:
        """Existing telescopes default to empty metadata."""
        telescope = post_telescope(CreateTelescope(name='Legacy telescope', health_status='OK'))
        self.assertEqual(telescope.metadata, {})
        self.assertEqual(post_command(self.point_command(telescope.id, 300.0)).point.target_az_angle, 300.0)

    def test_point_accepts_test_targets_and_endpoints(self) -> None:
        """Accept interior test targets and both configured boundaries."""
        telescope = self.create_configured_telescope()
        for target in (137.8, 150.0, 170.0, 190.0, 209.7):
            with self.subTest(target=target):
                self.assertEqual(post_command(self.point_command(telescope.id, target)).point.target_az_angle, target)

    def test_point_rejects_outside_window_without_storing_commands(self) -> None:
        """Return an actionable error before out-of-range commands reach hardware."""
        telescope = self.create_configured_telescope()
        for target in (100.0, 220.0, 250.0, 300.0):
            with self.subTest(target=target), self.assertRaises(HTTPException) as error:
                post_command(self.point_command(telescope.id, target))
            self.assertEqual(error.exception.status_code, 400)
            self.assertIn('137.8° to 209.7°', error.exception.detail)
        self.assertEqual(get_commands(), [])

    def test_point_uses_offset_and_validates_updates(self) -> None:
        """Convert true azimuth once and protect the existing update endpoint too."""
        telescope = self.create_configured_telescope()
        telescope.metadata['az_encoder_offset'] = 46.3
        update_telescope(telescope.id, telescope)
        command = post_command(self.point_command(telescope.id, 200.0))
        command.point.target_az_angle = 300.0
        with self.assertRaises(HTTPException) as error:
            update_command(command.id, command)
        self.assertEqual(error.exception.status_code, 400)
        self.assertIn('184.1° to 256.0°', error.exception.detail)
        self.assertEqual(get_commands()[0].point.target_az_angle, 200.0)

    def test_point_rejects_invalid_configuration(self) -> None:
        """Partial, invalid, nonnumeric and nonfinite metadata fail closed."""
        telescope = self.create_configured_telescope()
        invalid_metadata = (
            {'az_encoder_min': 137.8},
            {'az_encoder_min': -1, 'az_encoder_max': 137.8, 'az_encoder_offset': 0},
            {'az_encoder_min': 137.8, 'az_encoder_max': 360, 'az_encoder_offset': 0},
            {'az_encoder_min': True, 'az_encoder_max': 209.7, 'az_encoder_offset': 0},
            {'az_encoder_min': '137.8', 'az_encoder_max': 209.7, 'az_encoder_offset': 0},
            {'az_encoder_min': float('nan'), 'az_encoder_max': 209.7, 'az_encoder_offset': 0},
            {'az_encoder_min': 137.8, 'az_encoder_max': float('inf'), 'az_encoder_offset': 0},
        )
        database = Database()
        for metadata in invalid_metadata:
            database.update('telescope', {'metadata': json.dumps(metadata)}, {'id': telescope.id})
            with self.subTest(metadata=metadata), self.assertRaises(HTTPException) as error:
                post_command(self.point_command(telescope.id, 170.0))
            self.assertEqual(error.exception.status_code, 400)
        database.conn.close()
        self.assertEqual(get_commands(), [])

    def test_point_rejects_nonfinite_target(self) -> None:
        """Do not store a target that cannot represent a physical angle."""
        telescope = self.create_configured_telescope()
        for target in (float('nan'), float('inf'), -float('inf')):
            with self.subTest(target=target), self.assertRaises(HTTPException) as error:
                post_command(self.point_command(telescope.id, target))
            self.assertEqual(error.exception.status_code, 400)

    def test_wrapped_range_accepts_targets_and_endpoints(self) -> None:
        """Allow the measured-to-assumed arc through zero degrees."""
        telescope = self.create_configured_telescope()
        telescope.metadata['az_encoder_max'] = 37.8
        update_telescope(telescope.id, telescope)
        for target in (137.8, 150.0, 250.0, 350.0, 0.0, 10.0, 20.0, 37.8, 360.0):
            with self.subTest(target=target):
                command = post_command(self.point_command(telescope.id, target))
                self.assertEqual(command.point.target_az_angle, target)

    def test_wrapped_range_rejects_the_gap(self) -> None:
        """Explain the wrapped allowed range before storing a blocked target."""
        telescope = self.create_configured_telescope()
        telescope.metadata['az_encoder_max'] = 37.8
        update_telescope(telescope.id, telescope)
        for target in (50.0, 100.0, 132.0):
            with self.subTest(target=target), self.assertRaises(HTTPException) as error:
                post_command(self.point_command(telescope.id, target))
            self.assertEqual(error.exception.status_code, 400)
            self.assertIn('137.8° to 37.8° through 0°', error.exception.detail)
        self.assertEqual(get_commands(), [])

    def test_stale_calibration_state_does_not_block_numeric_point_targets(self) -> None:
        """Readiness belongs to firmware; API validation checks the raw target arc."""
        telescope = self.create_configured_telescope()
        ready = {
            'az_reference': 'true_north_estimate',
            'az_calibration_valid': True,
            'az_encoder_mapping_verified': True
        }
        states = (
            {'az_reference': 'true_north_estimate'},
            {'az_calibration_valid': True},
            {'az_encoder_mapping_verified': True},
            {**ready, 'az_reference': 'encoder'},
            {**ready, 'az_calibration_valid': False},
            {**ready, 'az_encoder_mapping_verified': False},
            {**ready, 'az_calibration_valid': 1},
            {**ready, 'az_encoder_mapping_verified': 'true'},
            {**ready, 'az_reference': None}
        )
        original_metadata = dict(telescope.metadata)
        for state in states:
            telescope.metadata = {**original_metadata, **state}
            update_telescope(telescope.id, telescope)
            with self.subTest(state=state):
                command = post_command(self.point_command(telescope.id, 170.0))
                self.assertEqual(command.point.target_az_angle, 170.0)
        self.assertEqual(len(get_commands()), len(states))

    def test_ready_calibration_accepts_unverified_alignment_warning(self) -> None:
        """Alignment remains an independent warning rather than a new gate."""
        telescope = self.create_configured_telescope()
        telescope.metadata.update({
            'az_reference': 'true_north_estimate',
            'az_calibration_valid': True,
            'az_encoder_mapping_verified': True,
            'az_alignment_verified': False
        })
        update_telescope(telescope.id, telescope)
        command = post_command(self.point_command(telescope.id, 170.0))
        self.assertEqual(command.point.target_az_angle, 170.0)
        self.assertEqual(get_telescope(telescope.id).metadata, telescope.metadata)

    def test_point_update_ignores_stale_calibration_readiness(self) -> None:
        """A stale status flag cannot prevent a numerically valid Point update."""
        telescope = self.create_configured_telescope()
        command = post_command(self.point_command(telescope.id, 170.0))
        telescope.metadata['az_calibration_valid'] = False
        update_telescope(telescope.id, telescope)
        command.point.target_az_angle = 190.0
        self.assertEqual(update_command(command.id, command).point.target_az_angle, 190.0)
        self.assertEqual(get_commands()[0].point.target_az_angle, 190.0)

    def test_true_north_is_rejected_when_it_maps_into_the_raw_gap(self) -> None:
        """True zero must not override raw mechanical restrictions at any offset."""
        telescope = self.create_configured_telescope()
        telescope.metadata.update({
            'az_encoder_max': 37.8,
            'az_reference': 'true_north_estimate',
            'az_calibration_valid': True,
            'az_encoder_mapping_verified': True
        })
        for offset in (260.0, 300.0):
            telescope.metadata['az_encoder_offset'] = offset
            update_telescope(telescope.id, telescope)
            for target in (0.0, 360.0):
                with self.subTest(offset=offset, target=target):
                    with self.assertRaises(HTTPException) as error:
                        post_command(self.point_command(telescope.id, target))
                    self.assertEqual(error.exception.status_code, 400)
                    self.assertIn('outside the allowed range', error.exception.detail)
            self.assertEqual(post_command(self.point_command(telescope.id, 150.0)).point.target_az_angle, 150.0)
        self.assertEqual(len(get_commands()), 2)

    def test_true_north_is_allowed_when_it_maps_inside_the_wrapped_raw_arc(self) -> None:
        """Apply the offset once and retain wrap-through-zero targets."""
        telescope = self.create_configured_telescope()
        telescope.metadata.update({
            'az_encoder_max': 37.8,
            'az_encoder_offset': 49.7,
            'az_reference': 'true_north_estimate',
            'az_calibration_valid': True,
            'az_encoder_mapping_verified': True
        })
        update_telescope(telescope.id, telescope)
        for target in (0.0, 360.0, 187.5, 87.5):
            with self.subTest(target=target):
                self.assertEqual(post_command(self.point_command(telescope.id, target)).point.target_az_angle, target)

    def test_explicit_compass_test_mode_allows_reachable_point(self) -> None:
        """Temporary estimates permit testing without claiming real calibration."""
        telescope = self.create_configured_telescope()
        telescope.metadata.update({
            'az_reference': 'compass_test_estimate',
            'az_compass_test_mode': True,
            'mag_declination_supported': True,
            'az_calibration_valid': False,
            'az_encoder_mapping_verified': False,
            'az_alignment_verified': False
        })
        update_telescope(telescope.id, telescope)
        command = post_command(self.point_command(telescope.id, 170.0))
        self.assertEqual(command.point.target_az_angle, 170.0)
        command.point.target_az_angle = 190.0
        self.assertEqual(update_command(command.id, command).point.target_az_angle, 190.0)
        self.assertEqual(get_telescope(telescope.id).metadata, telescope.metadata)

    def test_stale_test_mode_state_does_not_block_numeric_point_targets(self) -> None:
        """Old mode/status metadata must not become an API readiness gate."""
        telescope = self.create_configured_telescope()
        test_state = {
            'az_reference': 'compass_test_estimate',
            'az_compass_test_mode': True,
            'mag_declination_supported': True
        }
        states = (
            {'az_compass_test_mode': True},
            {'az_reference': 'compass_test_estimate'},
            {'mag_declination_supported': True},
            {**test_state, 'az_reference': 'encoder'},
            {**test_state, 'az_reference': 'true_north_estimate'},
            {**test_state, 'az_compass_test_mode': False},
            {**test_state, 'az_compass_test_mode': 1},
            {**test_state, 'az_compass_test_mode': 'true'},
            {**test_state, 'az_compass_test_mode': None},
            {**test_state, 'mag_declination_supported': False},
            {**test_state, 'mag_declination_supported': 1},
            {**test_state, 'mag_declination_supported': None},
            {'az_reference': 'compass_test_estimate', 'az_compass_test_mode': True}
        )
        original_metadata = dict(telescope.metadata)
        for state in states:
            telescope.metadata = {**original_metadata, **state}
            update_telescope(telescope.id, telescope)
            with self.subTest(state=state):
                command = post_command(self.point_command(telescope.id, 170.0))
                self.assertEqual(command.point.target_az_angle, 170.0)
        self.assertEqual(len(get_commands()), len(states))

    def test_compass_test_mode_keeps_raw_limits_and_zero_blocking(self) -> None:
        """Temporary references cannot override unreachable raw targets."""
        telescope = self.create_configured_telescope()
        telescope.metadata.update({
            'az_encoder_max': 37.8,
            'az_encoder_offset': 260.0,
            'az_reference': 'compass_test_estimate',
            'az_compass_test_mode': True,
            'mag_declination_supported': True,
            'az_calibration_valid': False,
            'az_encoder_mapping_verified': False
        })
        update_telescope(telescope.id, telescope)
        command = post_command(self.point_command(telescope.id, 150.0))
        for target in (0.0, 360.0):
            with self.subTest(target=target):
                with self.assertRaises(HTTPException) as error:
                    post_command(self.point_command(telescope.id, target))
                self.assertEqual(error.exception.status_code, 400)
                self.assertIn('outside the allowed range', error.exception.detail)
        command.point.target_az_angle = 0.0
        with self.assertRaises(HTTPException):
            update_command(command.id, command)
        self.assertEqual(len(get_commands()), 1)
        self.assertEqual(get_commands()[0].point.target_az_angle, 150.0)

    def test_point_update_ignores_stale_declination_support_flag(self) -> None:
        """Firmware date status does not replace numeric API limit validation."""
        telescope = self.create_configured_telescope()
        telescope.metadata.update({
            'az_reference': 'compass_test_estimate',
            'az_compass_test_mode': True,
            'mag_declination_supported': True
        })
        update_telescope(telescope.id, telescope)
        command = post_command(self.point_command(telescope.id, 170.0))
        telescope.metadata['mag_declination_supported'] = False
        update_telescope(telescope.id, telescope)
        command.point.target_az_angle = 190.0
        self.assertEqual(update_command(command.id, command).point.target_az_angle, 190.0)
        self.assertEqual(get_commands()[0].point.target_az_angle, 190.0)


if __name__ == '__main__':
    unittest.main()
