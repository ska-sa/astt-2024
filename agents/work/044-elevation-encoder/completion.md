# ASTT-044: EL raw encoder reading — partial delivery

2026-10-30. Operator confirmed AZ still works on restored master and approved
reading the same PWM encoder type on GPIO35. Full ticket remains open.

- Added GPIO35 input and a raw duty-angle reader in the single integrated `.ino`.
- Reads at most once per 100 ms, with each HIGH/LOW wait limited to 25 ms.
- Reports `elEnc` and `EL_ENC=OK/ERR` in Serial and API `serial_log`, already
  visible under Show more. A missing pulse invalidates the value (`nan`).
- Keeps existing AZ, EL MPU feedback and motor behavior unchanged.
  Raw EL encoder degrees are not substituted for calibrated `elevation_angle`.
- Host checks pass: EL angle conversion, wrap, rate limit, absent HIGH/LOW/both,
  recovery, timer rollover, log serialization and no motor/angle side effects;
  existing AZ routes, commands, timeout, E-stop and networking checks also pass.

LOLIN32 compile passed with ESP32 core 3.3.12: 1,031,871 bytes flash (78%),
53,988 bytes static RAM (16%). `git diff --check` passed.
Hardware upload/readings, direction, scale,
limit switches, stops, zero and powered EL operation are not yet verified.
Follow the reading-only test in `hardware/README.md` with motor power disconnected.
No flash, service change, commit or push. Await operator test/confirmation.

## UI follow-up — 2026-10-30

Read-only inspection of the live API found raw `elEnc=36.92 EL_ENC=OK` but
`elevation_angle=0` from the unavailable EL MPU. The previous patch only exposed
the encoder in diagnostics, so the main UI/graph kept showing the MPU value.

- Added nullable `el_encoder_angle` in the firmware payload, API models, SQLite
  migration, every reading route and frontend interfaces. Older rows are retained.
- Compatibility parsing accepts the first firmware's explicitly valid raw-EL log
  so the currently uploaded firmware works without another upload. Invalid or
  missing encoder data remains null; it is never replaced by a command/MPU value.
- Live Position, history diagnostics, graph and Readings table show raw EL.
  Missing data shows Not available or a graph gap.
- Readings refresh every five seconds; CAM recovers after failed polling requests.
- Eight isolated backend tests, 52 focused Angular tests and the firmware host
  suite passed, including nullable readings, legacy data, polling, raw-zero display,
  telemetry serialization and the existing AZ/E-stop/command checks.

Frontend production build and backend image build passed. After explicit operator
approval, only ASTT's backend was recreated with its existing database volume.
The development frontend rebuilt from its mounted source. Live latest and
single-reading endpoints then returned `el_encoder_angle=37.01` on reading 6964
(2026-10-30 13:23:57 UTC), independently of MPU elevation 0. Previous records
remain accessible; other containers were left running. UI behavior was checked
in the headless Angular tests, not a logged-in live browser session.

Motor control, pins and physical qualification remain outside this UI fix.
No hardware flash, command submission, commit or push. Full ASTT-044 remains open
for operator direction/scale verification and physical stop/switch measurements.

## Operator acceptance and cleanup — 2026-10-30

Operator confirms EL readings are visible and approves commit/push to master.
Removed the unsolicited MPU elevation/pending-calibration text, duplicate table
column and graph series, including unused graph data plumbing. Added the requested
minimal-UI rule to AGENTS.md. All 52 focused UI tests pass after cleanup.
Raw readings are accepted; physical stops, scale, zero and movement remain pending.

Reading/UI acceptance was committed and pushed as `4da6e3c`. The subsequent
local ASTT-055 patch consistently labels the value **Elevation Angle**, applies
hardcoded `EL_ENCODER_OFFSET=0` through reading/target conversions, and enables
bounded encoder-feedback Point tests. See ASTT-055 completion notes for software
validation; physical stop measurements and qualification remain pending.
