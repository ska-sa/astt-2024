# ASTT-092: Reading diagnostics and sensor health

**Status:** Software verified; operator firmware upload/physical testing pending

## Implemented

- Added optional nullable `serial_log` to every existing reading path, backed by
  an idempotent SQLite TEXT-column migration. Legacy rows/payloads remain valid;
  null logs show a fallback, not fabricated history. API limit: 2048 characters.
- A bounded 1024-byte firmware snapshot is shared by Serial and its reading
  payload. It includes actual sensor checks/values, encoder and target frames,
  reference/offset/date, direction/requested PWM, command ID/event and prior HTTP
  results. It never includes credentials. Serial prints at 1 Hz; API posts use
  the existing five-second cadence. This is a reading snapshot, not console streaming.
- CAM live/history and reading-list rows show escaped, collapsed Show more text;
  polling refreshes the latest line. Every implemented reading view is updated.
  The placeholder telescope-details page does not have an invented new feature.
- Firmware derives health from current checks: FAULT for E-stop/invalid AZ
  encoder/heading/date; DEGRADED for missing MPU/EL MPU/GPS fix; otherwise OK.
  OK means sample availability, not calibration/accuracy. UI shows actual health,
  movement state and stale/offline state, not always-green/always-Moving labels.
- Under ASTT-043, removed teammate calibration helpers, Preferences storage,
  serial capture, temporary modes and verification-state gates. Raw compass plus
  the existing local declination supplies an uncalibrated estimate. Metadata
  publishing is best effort and no longer blocks commands. Raw limits, E-stop,
  timeout, encoder freshness and no replay/restart remain. EL/source equations unchanged.
- Held E-stop continues posting fault readings with motors stopped and without
  polling motion commands. Proper calibration remains pending under ASTT-047.

## Concrete runtime issue and approved fix

ASTT's backend was stopped. Unrelated auto-scheduler app containers owned ports
8000/4200, and the firmware's ASTT URLs returned 404 from the wrong application.
This was verified separately from the possible metadata gate in the old code.

The user explicitly approved stopping only auto-scheduler frontend/backend and
starting ASTT on its existing ports. Those two apps were stopped; auto-scheduler
MongoDB and other services were left running. No volumes/records were deleted.

Before starting ASTT, copied the stopped `/app/databases` directory to
`/tmp/astt-simple-heading-HAxZAN/database-backup`. Rebuilt/started ASTT using:

```bash
docker compose --env-file software/.env -f software/docker-compose.yaml up --build -d
```

The existing `software_backend-databases` volume was retained. Frontend HTTP and
device-7 latest reading/command GET routes now return 200, with existing IDs and
sensor data present. The new field returns null for old firmware payloads, as
expected. No live motion command or artificial reading was posted by the agent.

## Verification

- LOLIN32-target compilation passed: 1,025,411 bytes flash (78%) and 53,964 bytes
  global data (16%). This is compilation, not proof of hardware accuracy.
- Host tests passed all 129,600 safe routes, raw compass/date validation, stopped
  stability, command completion/no replay, timeout, measured health, bounded
  shared snapshots and the actual held-E-stop telemetry branch.
- Five isolated reading migration/CRUD/length/legacy tests and twenty isolated
  metadata/raw-limit tests passed. Live database was not used for unit tests.
- All 45 focused CAM/Readings browser tests and the production build passed.
  Existing CommonJS/Bootstrap warnings remain; SQLite datetime-adapter deprecation
  is pre-existing and does not fail tests.
- Whitespace checks passed. No board was flashed, motor energised, command sent,
  Git change staged/committed, merged or pushed by the agent.

## User handoff

Upload the revised single `.ino` once, then refresh CAM and open Show more on the
latest reading. Old records cannot acquire logs retroactively. With a valid,
stopped reference, submit a NEW Point ID inside the current UI allowed arc;
startup/completed commands intentionally do not replay. The existing red UI
hold is not a physical E-stop. Keep EL disconnected for AZ-only tests.

Readiness/heading/physical accuracy still need operator confirmation. A known-site
declination equation cannot remove local magnetic interference or mounting error;
no full calibration or movement accuracy is claimed. Progress is 39/85 complete;
ASTT-043/047/051 physical qualification stays open.

## Exact files changed for this request

```text
hardware/wemos_lilon32/wemos_lilon32.ino
hardware/tests/test_azimuth_control.py
hardware/tests/test_mag_calibration.py                 [obsolete test removed]
software/backend/classes/database.py
software/backend/classes/reading.py
software/backend/endpoints/readings.py
software/backend/endpoints/commands.py                 [numeric-only version restored]
software/backend/tests/test_telescope_metadata.py
software/backend/tests/test_reading_serial_log.py      [new]
software/frontend/src/app/components/cam/cam.component.ts
software/frontend/src/app/components/cam/cam.component.html
software/frontend/src/app/components/cam/cam.component.spec.ts
software/frontend/src/app/components/readings/readings.component.ts
software/frontend/src/app/components/readings/readings.component.html
software/frontend/src/app/components/readings/readings.component.spec.ts
software/frontend/src/app/interfaces/reading.ts
software/frontend/src/app/interfaces/create-reading.ts
software/frontend/src/app/interfaces/telescope.ts
README.md
hardware/README.md
hardware/magnetometer-test.md
software/README.md
agents/work/README.md
agents/work/043-azimuth-reference/prompt.md
agents/work/043-azimuth-reference/completion.md
agents/work/047-qualify-magnetometer/prompt.md
agents/work/092-reading-diagnostics/prompt.md            [new]
agents/work/092-reading-diagnostics/completion.md        [new]
```

Other pre-existing worktree edits were preserved. The old calibration test was
untracked; its former scenarios are intentionally no longer tests of active
firmware. Raw heading/date, routing, safety, health and diagnostic checks remain.
The runtime service switch and backup are documented above; compose/env files
and credentials were not changed.
