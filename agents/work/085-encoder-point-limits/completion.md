# ASTT-085 progress

**Status:** Wrapped-range Point tests passed — final calibration pending

## Implemented

- Removed changing magnetometer offsets from motion calculations.
- Set fixed encoder offset zero; the initial temporary bounds were `137.8°–209.7°`.
- Allowed only inward motion for readings just outside a bound within the
  existing `1°` measurement tolerance; out-of-range targets remain rejected.
- Kept circular smoothing and serial raw target/direction diagnostics.
- Added firmware publication of calibration through existing telescope GET/PUT.
- Added non-destructive SQLite JSON metadata migration and CRUD round-tripping.
- Added frontend and backend Point validation without silent angle correction.
- Retained the signed-in email beside Sign out.

## Verified

- Host C++ checks run the actual firmware math functions across 129,600 direction
  pairs, three interior targets, invalid old commands, and smoothing cases.
- Eleven isolated backend metadata/migration/command tests pass.
- Angular production build and eleven focused CAM validation tests pass.
- The backend test suite uses targeted discovery because the pre-existing
  `tests/test_database.py` has an indentation error; that unrelated file is unchanged.
- No production motion command is sent by the agent.
- Live backend migration passed with the existing telescope and command counts
  preserved and SQLite integrity `ok`. A private pre-migration backup is stored
  under the persistent database volume's `backups/` directory.
- Calibration publication retries on later readings if startup GET/PUT fails.
- User reports that Point targets `150°`, `170°`, and `190°` all work.
- The running API returns firmware-published metadata with offset zero and the
  initial `137.8°–209.7°` range, confirming configuration publication.

## User-selected wrapped range

- User authorizes assuming the opposite stop at `37.8°` for testing.
- Firmware, backend, and UI support the allowed arc from `137.8°` through zero
  to `37.8°`, with only the gap between `37.8°` and `137.8°` blocked.
- Host checks cover 129,600 direction pairs without crossing the gap. Backend
  and UI tests accept `250°`, `350°`, and `20°` and reject `100°`.
- The opposite stop remains assumed, not recorded as a verified measurement.
- User reports that Point targets `20°`, `30°`, and `200°` work without hitting
  a limit switch and accepts the current implementation for commit.

## Remaining

- Repeat the three targets in both directions and verify stopping accuracy.
- Physically verify the assumed `37.8°` opposite stop.
- True-north control and physical qualification remain separate work.

## Repeatable computer checks

```bash
python3 hardware/tests/test_azimuth_control.py
cd software/backend
.venv/bin/python -m unittest discover -s tests -p test_telescope_metadata.py -v
```
