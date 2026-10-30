# ASTT-055 completion notes

**Status:** DONE for basic encoder-feedback EL Point movement — operator confirmed 2026-10-30.
Earlier MPU experiments and test restrictions below are historical. Limits,
midpoint zero and full qualification remain separate open tasks.

**Plan update 2026-10-30:** The uncommitted data-integration experiment is saved
in stash be08154f22328b75ad8d6ac8f3b441dfa855fed8. Application code is restored
to master 2ca62bc. The user now has an EL encoder: the next milestone is measured
limits, recorded midpoint-zero and encoder-based EL/both-axis movement under
ASTT-044/042/055/094. The MPU work below is historical, not a dependency; noisy
sensor referencing and fitting are deferred. Physical EL is not marked complete.

## Single moving-MPU data integration — 2026-10-23

The operator confirms one MPU on the moving dish, not two sensors. Its +Y-up
description and pasted gyro rates do not establish an elevation formula. The
verified AZ package was committed/pushed as `2ca62bc` before this work. These EL
changes remain local/uncommitted, and no hardware has been flashed or moved by
the agent.

### Implemented first part

- Replaced the second/base-MPU assumption with one moving-sensor read. Probe
  0x68/0x69, check MPU identity, wake/enable all axes and explicitly configure
  ±2 g/±250°/s with readback. Gyro rates are not integrated into an angle.
- Bounded I2C reads and one-second retry/100 ms settling; no recovery wait loop.
  Read one frame, reject transfer/config/device failures and implausible gravity,
  keep old vectors only as stale diagnostics, and expire freshness after 250 ms.
- Existing acceleration and gyroscope API fields now describe the moving dish
  MPU, in m/s² and °/s. Serial/Show more include selected address, validity, age
  and raw g; `mpu_tilt` is diagnostic roll/pitch, not a levelled-base reference.
- Removed the old base-pitch subtraction/clamped guessed elevation. Both
  `EL_CONTROL_ENABLED` and `elAngleValid` remain false: changing only the enable
  flag cannot drive from an invented angle. Fresh data does not arm EL.
- Metadata reports `el_reference=UNCONFIGURED`. CAM shows Not configured instead
  of treating the compatibility numeric elevation placeholder as measured zero;
  acceleration, gyro, magnetic values and escaped reading logs remain visible.
- Working AZ/reference, motor pins/PWM, network/Point/Track schemas/math,
  E-stop and command lifecycle are unchanged. No new buttons, Serial commands,
  backend implementation, dataset/library dependencies or motor operation.

### Software verification

- `python3 hardware/tests/test_elevation_feedback.py`: PASS — actual register/
  frame functions with fake Wire, identity/address fallback, configuration and
  failed readback, retries/settling, signed units, invalid/short/NACK frames,
  retained last values, freshness boundaries/rollover and recovery. Actual EL
  control fragment stays stopped for Point/Track and independent enable/angle/
  freshness gates. These are host simulations, not sensor measurements.
- `python3 hardware/tests/test_azimuth_control.py`: PASS — all 129,600 routes and
  the manual/fallback reference, sensor, timeout, command/E-stop/queued-response
  regression checks. Harness changes reflect unconfigured EL and new diagnostics.
- Combined CAM/Readings/Telescopes ChromeHeadless suite: 58/58 PASS. The two new
  cases cover unconfigured EL/data visibility and legacy numeric compatibility.
- Angular production build: PASS; existing CanvasJS CommonJS/Bootstrap warnings.
- Final Arduino CLI compilation for `esp32:esp32:lolin32`: PASS — 1,031,671 bytes
  flash (78%), 53,980 bytes globals (16%). Build/cache stay under `/tmp`; no
  upload performed.
- Diff whitespace check passes. Live MPU validity/mounting/stopping remain
  unverified; the user's previously supplied gyro values are not new valid data.

### Files in this first part

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/tests/test_elevation_feedback.py` (new)
- `hardware/tests/test_azimuth_control.py` (harness compatibility)
- `software/frontend/src/app/interfaces/telescope.ts`
- `software/frontend/src/app/components/cam/cam.component.html`
- `software/frontend/src/app/components/cam/cam.component.spec.ts`
- `hardware/README.md`, `software/README.md`, root `README.md`, `agents/work/README.md`
- This record and `agents/work/055-elevation-control/prompt.md`

Unrelated local planning edits and the earlier AZ records remain preserved.
The AZ push also reported existing GitHub dependency alerts (135 total, including
5 critical); no dependency upgrades or unrelated security changes were attempted.

### Historical MPU experiment next step — superseded by encoder-first plan

After the operator uploads the updated single integrated sketch, inspect
Serial or CAM Show more: require `MPU_SAMPLE=VALID` and an identified address.
If it stays stale/unavailable, verify sensor power/common ground and existing
SDA21/SCL22 wiring before interpreting its numbers; never infer a bad sensor
or enable output from retained readings.

With the MPU rigidly mounted and base manually levelled, record **Acceleration
X/Y/Z**, with units, at independently known 0° and about 30° dish elevations.
Wait until stationary at each. Gyro X/Y/Z are not the requested data. Use the
vectors to select the real rotation plane, sign and zero in the next part.

Do not merely enable the flag. The verified tilt model, raw-angle limits and
stopping margins, feedback-loss/completion behavior and independent channel-B
hardware tests still have to be completed before simultaneous AZ/EL movement.
ASTT-055 stays open; no physical completion or absolute EL accuracy is claimed.

## Historical two-MPU draft (superseded)

The root checklist was corrected from complete to pending after the user's
follow-up. No motor-control implementation or hardware work was performed while
logging this request. EL encoder work stays under ASTT-044, relative zero under
ASTT-042, level indication under ASTT-089, and qualification under ASTT-050.

## Implemented

- Added independent MPU6050 reads at addresses `0x68` and `0x69`.
- Added an L298 channel-B firmware draft. The current pin map supersedes the
  original notes: GPIO26 (IN3), GPIO25 (IN4), GPIO32 (ENB/PWM).
- Added Point and Track elevation targets with a 0–90 degree limit.
- Stopped elevation movement when feedback is missing or E-stop is active.
- Reserved GPIO35 for a future elevation encoder without using it.

## Verification

- Checked the Point field against the backend schema: `target_el_angle`.
- Original pin checks are historical; use the current integrated firmware pin map.
- Confirmed both I2C addresses are distinct.
- Confirmed the source elevation calculation feeds the Track target.
- Firmware compilation was not run because Arduino CLI and PlatformIO are absent.
- No hardware was flashed, wired, powered, or moved.

## Remaining hardware checks

- Confirm the proposed pins against the final physical wiring.
- Calibrate `EL_MPU_SIGN` and `EL_ZERO_OFFSET` for the mounted MPU orientation.
- Compile the firmware when an Arduino toolchain is available.
- Bench-test MPU readings and motor direction with the motor mechanically disconnected.

## Encoder Point test patch — 2026-10-30

AZ and EL encoder readings were accepted by the operator; the reading/UI change
and minimal-UI rule were committed and pushed as `4da6e3c`. This next movement
patch is local, uncommitted and unflashed. The operator confirmed the EL motor
is connected and physical limit switches open motor power directly.

- Existing Point commands now drive EL from the GPIO35 PWM encoder. Keep AZ at
  its current reading for EL-only tests. No EL software endpoints are invented.
- Hardcoded `EL_ENCODER_OFFSET=0` applies to displayed `elevation_angle`, with
  the inverse conversion applied to targets. Later measured/sensor references
  can replace the offset; zero is not sampled at boot. `el_encoder_angle`
  remains the internal/raw feedback for recording limits.
- `EL_MOTOR_SIGN=1` is the initial direction setting to check physically.
  Each fresh Point has a three-second EL deadline, independent of repeated-ID
  heartbeats. Arrival, lost/stale feedback and E-stop stop output. A new command
  is required after stopping; EL celestial Track is disabled for this phase.
- Removed the unused second-MPU EL feedback draft. Existing base-MPU telemetry,
  AZ limits/pins, source calculations, networking and E-stop flow are retained.
- UI labels consistently read **Elevation Angle**, matching **Azimuth Angle**.
  Live/history/table/chart values use the referenced angle; software hold sends
  that same angle. Null feedback remains unavailable. No calibration filler.
- Backend compatibility exposes the original reading-only firmware's encoder
  value as elevation when its valid diagnostic carries `EL_MPU=`. New firmware's
  already-offset elevation is preserved. Historical database rows are retained.

Validation: host checks passed all 129,600 AZ routes plus EL positive/negative
motion, wrap and nonzero-offset conversion, arrival latch, repeated IDs, deadline,
stale/lost feedback and E-stop. Nine isolated backend tests and 52 focused
ChromeHeadless UI tests pass. Angular production build passes with existing
CanvasJS/Bootstrap warnings. Arduino CLI `esp32:esp32:lolin32` compilation passes:
1,031,795 bytes flash (78%), 53,980 bytes static RAM (16%). Diff whitespace passes.

Only ASTT's backend was rebuilt/recreated under the earlier restart approval;
its database volume was preserved. Latest and single-reading API routes agreed
on 37.02096° elevation/encoder for reading 7230. The frontend rebuilt its mounted
source. No motor commands or hardware uploads were performed.

Physical direction, encoder scale, stopping, both limit values, midpoint and
combined-axis behavior remain pending. Start with a 2–3° EL change near the
current reading, verify direction, then record the stops using short fresh
commands. See `hardware/README.md` for the supervised sequence. Full ASTT-055
remains open; absolute pointing accuracy and automatic sensor references are deferred.

Files for this phase: integrated `.ino`, `hardware/tests/test_azimuth_control.py`,
backend `classes/reading.py` and `tests/test_reading_serial_log.py`, CAM template/
component/spec, Readings template/spec, hardware/software READMEs, root/backlog
status entries, and ASTT-044/055 records. Other earlier backlog work remains local
and was excluded from the scoped reading/UI commit.

### Minimum-power test follow-up — 2026-10-30

The operator reports EL humming without moving and requests doubled minimum
drive for both axes. Set EL minimum from 140 to 255 and AZ from 210 to 255:
both requested doubles exceed the existing PWM ceiling, so they are capped.
Both axes now command full duty outside tolerance; this does not prove sufficient
motor torque. Encoder feedback, E-stop, completion latches and the three-second
EL deadline are unchanged. If EL still hums at full duty, stop the test and check
the motor supply/driver/mechanical load rather than increasing the PWM value.

Host checks pass, including full-duty bounds and zero output within tolerance.
LOLIN32 compile passes: 1,031,791 bytes flash, 53,980 bytes static RAM. Diff check
passes. No upload, motor command, commit or push; physical retest remains pending.
### Final PWM settings for operator retest — 2026-10-30

The operator confirms EL does move, but slowly, and requests full-duty EL while
restoring AZ's previous setting. EL minimum/maximum remain 255/255; AZ is now
210/255 with its existing ramp. Stop tolerance, E-stop and the three-second EL
deadline are unchanged. Host motor-control checks pass, including both PWM ranges.
Physical confirmation remains pending; no flash or push.

### Run EL to its encoder target — 2026-10-30

At the operator's request, removed the three-second EL movement cutoff and its
unused timer variables. This supersedes the test deadline recorded above. EL
Point now continues until the encoder target is within 1° tolerance, using the
same fixed offset for display and inverse target conversion. EL PWM remains
255; AZ remains 210–255. Missing/stale feedback, E-stop and the existing ten-second
communication timeout still stop outputs. Repeated polling keeps an active Point
alive but cannot restart a finished or fault-stopped Point. Physical switches
still cut motor power; their software stop values remain to be measured.

The host suite passes, including simulated slow EL movement lasting 12 seconds
with polling, arrival, missing/stale feedback, E-stop and communication loss.
LOLIN32 compile passes: 1,031,671 bytes flash, 53,972 bytes static RAM. Diff check
passes. No upload, motor command, commit or push; operator confirmation is pending.

### Operator acceptance — 2026-10-30

After setting `EL_MOTOR_SIGN=-1`, the operator confirms everything works in both
EL directions and asks to mark the task complete. ASTT-055 is closed for basic
encoder-feedback Point movement. EL PWM remains 255/255 and AZ 210/255. No fixed
EL motion deadline; the target uses the same reference as the displayed angle.

The motor is too slow for the desired use, so ASTT-096 records replacement with
a faster suitable EL motor, followed by direction, loaded-speed and stopping
checks. Numerical endpoints, midpoint zero, repeatability/accuracy, combined-axis
return-to-zero and physical fault qualification are not claimed here; they remain
ASTT-044/042/045/046/050/051/094/078. No new runtime/code changes, flash or push
were made while recording this acceptance.

### Approved commit verification — 2026-10-30

The operator requested commit and push to master after accepting both directions.
Updated the host regression expectations to the physically confirmed EL polarity
(`EL_MOTOR_SIGN=-1`); firmware behavior is unchanged from the accepted test.
Final checks pass: 129,600 AZ routes and EL motion/offset/arrival/fault checks,
9 isolated backend tests, 52 ChromeHeadless UI tests, Angular production build,
and LOLIN32 compile (1,031,671 bytes flash, 53,972 bytes static RAM). Existing
CanvasJS/Bootstrap build warnings remain. Backlog counts are 41/89; ASTT-096
records the faster EL motor. The earlier sensor-experiment stash is retained.
