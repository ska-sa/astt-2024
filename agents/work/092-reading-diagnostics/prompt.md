# ASTT-092: Expose reading diagnostics and measured sensor health

**Status:** Software verified; operator firmware upload/physical testing pending
**Area:** Hardware and software integration

## Context

The user needs to diagnose Point failures remotely without a serial cable.
Full magnetic calibration remains ASTT-043/047 work; the user requests removal
of its temporary modes/gates and a simpler compass-reference path for now.

## Goal

Store one bounded diagnostic snapshot on each reading and show it throughout
the implemented reading views, with health based on actual sensor checks.

## In scope

- Optional nullable `serial_log` TEXT on existing reading models/table/routes;
  idempotent migration preserving old rows and accepting legacy payloads.
- Shared single-line firmware Serial/API snapshot: readings, sensor health,
  command events, reference/target/direction/power and prior HTTP results.
- Escaped collapsed Show more for CAM live/history and reading-list rows.
- Truthful health/movement display and stale/offline indication.
- Under ASTT-043, raw compass plus fixed-site/date declination without calibration
  modes/storage/manual capture. Preserve raw limits, E-stop, timeout and IDs.
- Best-effort metadata publication, never permission to read or execute commands.
- User-approved service switch: stop only auto-scheduler frontend/backend, retain
  its databases, back up ASTT and run ASTT on existing ports/volumes.

## Out of scope

- Console streaming, a new endpoint/log service, pin or EL implementation changes.
- Hardware accuracy/qualification, agent flashing/motion, commits/merges/pushes.
- Stopping auto-scheduler's database or deleting/clearing volumes or records.

## Decisions

- API field is optional/null with a 2048-character limit. Firmware snapshot uses
  a 1024-byte buffer. Legacy records show a fallback, not fabricated diagnostics.
- FAULT: E-stop/invalid AZ encoder/heading/date. DEGRADED: missing MPU/EL MPU/GPS
  fix. OK: these availability checks pass, not a claim of calibrated accuracy.
- Runtime finding: ASTT was stopped; auto-scheduler owned 8000/4200, so the
  configured ASTT routes returned 404. User explicitly approved the service swap.

## Acceptance criteria

- [x] Additive migration preserves IDs/timestamps/sensor values and is repeatable.
- [x] Existing reading paths and legacy payloads round-trip diagnostics.
- [x] Escaped diagnostics update in every implemented reading view.
- [x] Health/movement/offline states display truthfully.
- [x] LOLIN32 compilation, host/backend/frontend tests and UI build pass.
- [x] ASTT routes serve existing persistent data after the approved service swap.
- [x] Work records and checklist distinguish software checks from physical tests.

## Verification

Isolated SQLite migration/CRUD and raw-limit tests; focused CAM/Readings tests;
production UI build; LOLIN32 compile and host safety checks; read-only live
schema/reading/command checks. No live motion commands or synthetic readings.
