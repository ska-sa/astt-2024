# ASTT-043 progress notes

**Status:** Done 2026-10-23 — manual-demo reference accepted by the operator

## Operator acceptance — 2026-10-23

The operator reports that physical AZ movement works well and confirms Point
0° at the midpoint, 90° to its right and 275° to its left. The operator accepts
the manual-reference task as complete and defers further calibration. These are
operator-reported functional tests, not agent measurements or numerical
absolute-accuracy, stopping-distance or extended Track qualification. Those
remain ASTT-046/047/049/051/067. No automatic north detection is claimed.

ASTT-043 is closed for that explicitly accepted manual-demo scope; project
now has 40 completed items. Unrelated planning drafts remain local and are not
part of this verified AZ commit. EL is the next requested task, but the +Y-up mounting
description needs actual sensor/address and known-angle confirmation before
changing its control formula. The operator has now explicitly authorized commit
and push of the verified AZ work before separate EL changes. No agent flash or
motor action is authorized or performed; commit/push outcome will be reported
with the resulting revision rather than inferred from this authorization.

## Manual initial alignment revision — 2026-10-23

### Approved scope and decisions

Built on the user's existing dirty ASTT working tree, preserving those edits.
The final instruction limits implementation to AZ/manual-reference and compass
integration; EL and all other work are logged only. This supersedes the initial
request to implement both ASTT-043 and ASTT-055 now.

The operator confirms both AZ stops (`137.8°`, `37.8°`), clockwise 1:1 encoder
mapping, EL 0–90° travel and current EL sign/zero/motor direction. These reports
are not agent measurements or qualification of stopping/absolute accuracy.

The latest instruction also replaces the initial confirmation-control request:
no new UI buttons, calibration/login errors or Serial interaction. The operator
manually levels the base and points it to true north with AZ physically at the
permitted-arc midpoint, then sends a new command. Firmware assumes that work was
done; it cannot detect base repositioning. No automatic alignment or north
detection is claimed. Stop and realign after repositioning.

### Implemented (ASTT-043 only)

- `USE_MANUAL_AZ_REFERENCE = true`, configurable `encoderAtNorth = 267.8°`.
  The permitted raw arc spans 260° through zero; its midpoint is
  `norm360(137.8 + 260/2)`, not the ordinary average `87.8°`.
- Fixed offset `norm360(-encoderAtNorth) = 92.2°`; measured AZ is raw encoder
  plus offset, raw target is true AZ minus offset, each wrapped once. The offset
  initializes before telemetry, even if the encoder is unavailable at boot.
  Current boot position and magnetic readings never redefine manual north.
- Reused the supplied working compass's shared-Wire initialization, automatic
  SET/RESET, 100 Hz bandwidth, 20 Hz continuous mode, one-second retry and 100 ms
  settling. Continuous reads/reconnect handling preserve diagnostic measurements.
  The working sketch's sensitivity (`16384 counts/gauss`) is converted to Tesla
  for the existing API, replacing the old incorrect `6.25e-10 T/count` scaling.
- Retained magnetic/mounting/declination calculations, raw fields and stale
  status separately. Missing compass/declination reports DEGRADED but cannot
  block manual Point. Celestial Track's existing real-UTC check is unchanged;
  no demo date fallback was copied from the standalone test.
- Metadata, logs and CAM identify `MANUAL_ALIGNMENT`. Serial output, magnetic
  readings and escaped Show more remain visible. Manual-mode CAM omits obsolete
  compass-calibration/date warnings, without adding controls or readiness gates.
- Pins, API request/response schemas, networking/worker ownership, Point/Track
  calculations, raw encoder routes, PWM values, E-stop, timeout, command baseline
  and completed-Point protection remain unchanged. EL functions/control are
  unchanged, including their existing limitations.
- With user approval, retained the standalone compass sketch separately under
  `hardware/research/magnetometer-live-test/`; the integrated Arduino folder now
  contains one `.ino`, avoiding duplicate `setup()`/`loop()` and sensor instances.

### Software verification

- `python3 hardware/tests/test_azimuth_control.py`: PASS — 129,600 safe routes;
  fixed manual offset/telemetry/metadata; missing compass/date; compass fallback;
  bounded sensor retries/settling/recovery; Tesla units; startup baseline,
  completion/no replay, timeout, E-stop and delayed-response protections.
- Arduino CLI 1.5.1, ESP32 core 3.3.12:
  `arduino-cli compile --fqbn esp32:esp32:lolin32 --build-path <temporary-build> hardware/wemos_lilon32`:
  PASS — 1,031,523 bytes flash (78%), 53,980 bytes globals (16%). Actual local
  CLI was the mounted Arduino application's executable; cache/build stayed in
  `/tmp`. The final compile used the real sketch folder after the reference move.
- `CHROME_BIN=/usr/bin/google-chrome npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/components/cam/cam.component.spec.ts --progress=false`:
  44/44 PASS, including valid manual Point without compass/date, blocked targets,
  visible magnetic values and retained escaped reading diagnostics.
- `npm run build -- --configuration production --no-progress`: PASS; existing
  CanvasJS CommonJS and four Bootstrap-selector warnings only.
- Backend `.venv/bin/python -m unittest discover -s tests -p test_telescope_metadata.py`:
  20/20 PASS in temporary SQLite directories. System Python initially lacked
  FastAPI; rerunning with the existing backend virtualenv resolved that tooling
  issue without installing packages or changing application code/data.
- `git diff --check`: PASS. Independent review found no blocker in the final AZ
  scope. Host tests/mock UI do not establish sensor health, mechanical timing,
  stopping margins, true-north accuracy or physical E-stop operation.

### Files changed in this revision

Runtime and checks:

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/research/magnetometer-live-test/magnetometer-live-test.ino` (retained
  from the previously untracked `hardware/wemos_lilon32/magnetomet code only.ino`)
- `hardware/tests/test_azimuth_control.py`
- `software/frontend/src/app/interfaces/telescope.ts`
- `software/frontend/src/app/components/cam/cam.component.html`
- `software/frontend/src/app/components/cam/cam.component.spec.ts`

Documentation/planning:

- `README.md`, `hardware/README.md`, `hardware/magnetometer-test.md`, `software/README.md`
- `agents/work/README.md`
- `agents/work/043-azimuth-reference/prompt.md` and this completion record
- `agents/work/055-elevation-control/prompt.md` (log only)
- `agents/work/047-qualify-magnetometer/prompt.md` (log only)
- `agents/work/036-permanent-mounting-enclosure/prompt.md` (log only)
- `agents/work/037-sensor-connector-mounts/prompt.md` (log only)
- `agents/work/078-integrated-point-track-demo/prompt.md` (new; log only)

Earlier user changes in these files and unrelated firmware/backend/UI work are
preserved. No backend/authentication/EL implementation was added. The PhD and
older ASTT hardware repositories were untouched. No flash, motor operation,
live API/database writes, commit, merge or push. Physical checklist items remain
open and project count stays 39/86.

### Short operator hardware checklist (not performed by the agent)

1. Motor power disconnected: manually place AZ at raw `267.8°`, level the base,
   align its pointing direction with independently checked true north. Confirm
   encoder-derived AZ near 0°, offset 92.2°, and `MANUAL_ALIGNMENT` in diagnostics.
   Test at another safe manually placed raw angle to check the fixed conversion.
2. After the operator's own upload/preparation, verify startup does not move and
   old commands are ignored. Use terrestrial references, never solar optical
   viewing for these checks. Encoder agreement alone is not absolute accuracy.
3. With separate powered-test authorization, disconnect channel-B motor power
   and try short interior AZ targets approached from both directions. Verify
   stopping, raw limits, E-stop, timeout and no old-command restart on release.
4. Stop and redo alignment after moving the base. Send a new command, not an old
   replay. Log target, raw/measured AZ, error and reference mode independently.
5. EL unclamped feedback, stale/invalid-feedback safeguards, stopping margins and
   independent EL/combined-axis qualification remain ASTT-055/050/078. Do not
   treat the unchanged EL draft as newly qualified by this AZ software revision.

## Current revision — 2026-10-22

### Immediate reference — supersedes the stability gate below

The reported rejection event was the last command outcome, not current readiness.
A command arriving during the one-second reference gate could be consumed and
rejected before the reference became valid; its ID was correctly not re-armed later.

- Removed the stability timer/anchors. Valid stopped compass/encoder readings
  now calculate the north offset immediately, with no calibration gate. A new
  command can calculate a missing offset directly. The offset stays fixed during
  active movement. Real sensor/date failures name their cause; raw blocked
  targets, E-stop, timeout, startup baseline and no-replay protections remain.
- Diagnostics now say `last_event` rather than `event`; `stable_ms` is gone.
  An E-stop sampled during sensor reads immediately latches and clears targets,
  even if released before the next loop. No automatic old-command resume.
- Re-ran `magnetic-declination-model.py` with existing Python packages, Agg and
  no plot saves. It reproduced the current coefficients exactly:
  `(0.000701537703504*t - 0.233941835534)*t - 26.67043477086`, `t=year-2026`,
  fixed site `-33.944440, 18.479819`, altitude 6 m, compared for 2026–2027.
  At 2026-10-22 13:24 UTC this gives `-26.8587714°`, matching the supplied log.
  No invented replacement coefficients or research script edits were needed.
- UI audit confirms both position and graph use reported true-heading AZ once;
  no second offset or target-as-measurement replacement. Graph history still
  refreshes with Load graph. Uncalibrated magnetic/mounting error can still
  disagree with encoder stopping; mathematical declination is not calibration.

LOLIN32 compilation passed: 1,031,115 bytes flash (78%), 53,972 bytes globals
(16%). Host checks passed all 129,600 routes, immediate first-valid reference,
active-reference freeze, queued Point 90 from encoder 2.95/true 304.37 to raw
148.58, specific real sensor/date failures, brief E-stop latching, timeout and
same-ID/stale-reply protections. Whitespace check passed. Full calibration,
encoder mapping and the assumed opposite stop remain physically unqualified.
No UI/backend changes, motor operations, flash, commit or push in this follow-up.

Runtime check also found auto-scheduler's frontend/backend running on 4200/8000
again; the firmware-configured ASTT latest-reading route returned HTTP 404.
Service ownership was verified read-only. No services were changed; switching
the two app services back to ASTT requires the user's confirmation.

Files for this follow-up: integrated `.ino`, `hardware/tests/test_azimuth_control.py`,
`hardware/README.md`, `hardware/magnetometer-test.md`, `software/README.md`,
root `README.md`, and this completion record. Other dirty work was preserved.

### Latest simplification and remote diagnostics — ASTT-092

The user subsequently requested removal of the teammate calibration machinery
and temporary-mode complexity. This supersedes the strict/test-mode sections below.

- Removed all calibration helpers/storage/manual commands, Preferences dependency,
  test-mode and verification gates from the single `.ino`. Old NVS data is not
  erased; it is simply unused. A level raw compass uses canonical `atan2(Y, X)` +
  selected mounting `0°` + the existing fixed-site 2026–2027 declination equation.
- Kept one second of stopped encoder/compass stability for reference capture,
  a frozen offset during active movement, encoder-only travel limits, E-stop,
  timeout and completed/same-ID command protection. No sensor sweep or fitting
  runs on boot. No MPU frame or XYZ calibration is required to attempt AZ Point.
- Removed metadata-publication readiness as a command gate. Failed GET/PUT cannot
  prevent command polling; UI/backend validate numeric raw arc/offset only.
  Metadata is still published best effort through the existing telescope route.
- Shared bounded Serial/API diagnostics and measured health are implemented and
  documented under [ASTT-092](../092-reading-diagnostics/completion.md). E-stop
  telemetry continues while held, without accepting motion commands.
- Confirmed live failure: ASTT was stopped while auto-scheduler owned 8000/4200,
  so ASTT URLs returned 404 from the wrong app. With explicit user approval,
  stopped only its frontend/backend, backed up ASTT databases, retained volumes,
  rebuilt/started ASTT and verified live frontend/reading/command routes return 200.

Final LOLIN32 compile passed: `1,025,411` bytes flash (78%), `53,964` bytes globals
(16%). Host checks passed all 129,600 routes plus heading/date, stable reference,
command IDs, timeout, actual health, bounded snapshots and held-E-stop telemetry.
25 isolated backend tests, 45 focused frontend tests and production UI build pass.
No firmware was flashed or motion command sent; no staging/commit/merge/push.

The connected device is still running old firmware and posts `serial_log: null`;
one operator upload is required before remote diagnostics populate. Full physical
calibration, independent heading accuracy, encoder mapping and the assumed
opposite stop remain pending under ASTT-043/047/051. Progress is now 39/85 because
ASTT-092 software is verified, not because calibration was qualified.

The detailed file manifest for this follow-up is in the ASTT-092 completion record.

### Superseded temporary-mode implementation history

### Latest user-approved follow-up: uncalibrated compass testing

The user requested removal of mandatory calibration/orientation gates for now.
This explicit exception supersedes the strict prerequisites described below
only while `AZ_COMPASS_TEST_MODE = true`; calibration is still pending, not passed.

- The single `.ino` now uses valid saved calibration if available, otherwise a
  normalized factory-centered magnetic vector. Normalization is not a fitted
  magnetic calibration. No coefficients or valid/verified flags are invented.
- The selected mounting correction stays `0°`. Test mode assumes the user's
  manually level compass and the existing 1:1 encoder mapping; it does not need
  the base MPU, gyro or ±3° frame gate for AZ acquisition. Intermittent MPU reads
  remain an unresolved hardware issue for strict tilt/EL work.
- A fresh valid compass/encoder and one second of stopped stability are still
  required. The offset stays fixed during active Point/Track and may refresh at
  rest. Raw limits, E-stop, communication timeout, metadata publication and
  completed/same-ID Point protection are unchanged. No automatic motor sweep.
- UI/backend permit only the explicit test-ready metadata combination, retaining
  raw-arc checks. UI warns **Uncalibrated compass test mode — heading accuracy
  unverified**. Actual calibration/mapping/alignment flags stay honest. No new
  endpoint, schema, UI calibration button or source/elevation calculation.
- Serial identifies `cal UNCALIBRATED TEST` and `ref COMPASS TEST ESTIMATE` once
  the reference is available. Invalid/zero/saturated compass data, unavailable
  declination dates and active calibration capture remain blocking conditions.
- Full XYZ capture, verified sensor/encoder frames, installed interference and
  measured true-heading accuracy are deferred under ASTT-047. To restore all
  strict prerequisites set `AZ_COMPASS_TEST_MODE = false`; do not mark the real
  calibration/qualification tickets complete based on temporary test mode.

Verification: real LOLIN32-target compile passed (`1,028,019` bytes flash,
`60,188` bytes globals). Both hardware host suites passed, including all 129,600
route pairs, strict-mode rejection cases and explicit temporary-mode cases.
All **20** isolated backend tests and **42** focused ChromeHeadless CAM tests
passed; Angular production build passed with only the prior CommonJS/Bootstrap
warnings. Whitespace checks passed. No live database writes, hardware actions,
flashing, staging, commit, merge or push were performed. Progress stays 38/84.

For user testing, keep motor power disconnected first and check heading against
an independent reference. After the reference and metadata are ready, refresh
CAM and submit a new command, using an interior point in its current allowed arc
for a separately supervised motion check. Keep EL disconnected and the physical
E-stop accessible. These tests cannot guarantee accuracy or qualify the assumed
opposite stop. Logs/UI still must not describe this as calibrated true north.

Exact files changed for this temporary-mode follow-up:

```text
hardware/wemos_lilon32/wemos_lilon32.ino
hardware/tests/test_azimuth_control.py
software/frontend/src/app/components/cam/cam.component.ts
software/frontend/src/app/components/cam/cam.component.html
software/frontend/src/app/components/cam/cam.component.spec.ts
software/frontend/src/app/interfaces/telescope.ts
software/backend/endpoints/commands.py
software/backend/tests/test_telescope_metadata.py
README.md
hardware/README.md
hardware/magnetometer-test.md
software/README.md
agents/work/043-azimuth-reference/prompt.md
agents/work/043-azimuth-reference/completion.md
agents/work/047-qualify-magnetometer/prompt.md
```

### Earlier strict-mode revision and single-file migration

The user approved a focused calibration/reference revision. The older notes
below describe earlier versions, including the now-removed date fallback and
the earlier frontend/backend rollback; they are retained only as history.

- Removed the ambiguous combined +180/+90 expression in favour of the equivalent
  canonical `atan2(Y, X)` plus a separate mounting variable. The teammate's
  convention differs by 180 degrees and is not copied blindly.
- Added manual-only XYZ coverage checks, versioned Preferences persistence and
  explicit serial calibration commands. No boot sweep or invented coefficients.
- Unsupported model dates now return unavailable. The polynomial and site stay
  unchanged; raw telemetry units and source equations stay unchanged.
- Idle reference acquisition checks actual motor-stop flags and one second of
  encoder/compass stability. The reference is frozen during an active command.
- AZ Point completion is latched; same-ID polling refreshes communication time
  but cannot re-arm completed/stopped commands. E-stop requires a new baseline
  and a new command. No automatic repositioning recovery is implemented.
- The UI refreshes the existing metadata without issuing commands and blocks
  invalid calibration/reference states. Backend Point readiness is checked without
  changing the encoder-coordinate arc calculation. Alignment remains unverified.
- An idle reference change must be published successfully before a new motion
  command is accepted. Both outputs stop before blocking HTTP calls so a stalled
  backend cannot hold motor power on while feedback/E-stop checks are paused.
- Capture uses a fresh timestamp after a serial start, and an explicit late
  finish is rejected before any persistence write.
- Teammate sketch moved byte-for-byte out of the controller folder to
  `hardware/research/magnetometer-reference/magnetometer-reference.ino`; leaving
  two sketches together would duplicate Arduino globals and setup/loop functions.
- Encoder ratio/direction, sensor orientation, final mounting/interference,
  full installed calibration, opposite stop and E-stop qualification are not
  established by software tests. Default verification flags remain false.

### Verification of this revision

- Real ESP32 build passed with Arduino CLI 1.5.1, ESP32 core 3.3.12 and
  `--fqbn esp32:esp32:lolin32`. Flash use: `1,025,435` bytes (78%);
  global data: `60,180` bytes (18%). This is a compile, not a flash or hardware test.
- `python3 hardware/tests/test_azimuth_control.py` passed against extracted
  firmware functions and the actual AZ control block. It checks all 129,600
  integer-degree routes, wrapping/conversion, blocked north, stopped stability,
  reference freeze/refresh, persistence failure/reload, repeated command IDs,
  completion, E-stop baseline and communication timeout. The host fixture uses
  fake sensors/time/NVS; it does not establish physical accuracy.
- `python3 hardware/tests/test_mag_calibration.py` passed full synthetic XYZ
  captures and rejection/preservation cases for partial/planar/tiny sweeps,
  invalid samples, corrupt scales/version and stored calibration.
- Backend: `.venv/bin/python -m unittest discover -s tests -p
  test_telescope_metadata.py -v` from `software/backend` passed **16 tests** using
  temporary SQLite databases. No running database or production command changed.
- Frontend: **38 focused CAM tests** passed in ChromeHeadless; the Angular
  production build (`npm run build`) passed. Existing CanvasJS CommonJS and
  Bootstrap selector warnings remain; no new build error was reported.
- Final whitespace checks passed. The research source model and declination
  script contents were unchanged. The integrated source-coordinate calculation
  and MPU elevation-angle calculations are unchanged from the task snapshot.
- The teammate sketch was moved unchanged (SHA-256
  `3cf6effa62ccbd301760398bb1b78411a190f866be4c7a6dacaa5d6187161cd7`).
- No flashing, physical movement, Git staging/commit, merge or push was performed.

### Single-file Arduino IDE follow-up

- Moved the calibration constants, types and helpers into the main `.ino` and
  removed `mag_calibration.h`. Its implementation is retained in that file;
  no validation or persistence safeguards were removed. The sketch folder now
  contains only `wemos_lilon32.ino`.
- Updated both host suites to compile the actual inline helper section instead
  of relying on a custom header. Both suites pass with the same coverage.
- The single-file `esp32:esp32:lolin32` build passes: `1,025,435` bytes flash,
  `60,180` bytes global data (unchanged from the preceding build).
- Kept the user-selected mounting correction at `0°`. Verification flags stay
  false pending encoder mapping and independent heading checks; compiling in
  Arduino IDE is ready, but unrestricted powered testing is not approved.
- No UI/backend change or calibration button was added in this follow-up.
  Unplug/replug reloads saved calibration; explicit serial capture is still
  required to recalibrate. The fixed-site/date declination fit is unchanged and
  is not a general live-GPS geomagnetic model.
- This follow-up changes the `.ino`, removes its redundant header, adapts the two
  hardware host suites, and updates `hardware/README.md`,
  `hardware/magnetometer-test.md`, and this ticket's prompt/completion notes.
  No progress count changed; physical qualification remains open. No flashing,
  motor action, staging, commit, merge or push was performed.

### Operator handoff

`MAG_MOUNTING_OFFSET_DEG` is the requested separate rotation setting, accepting
values such as `0`, `90` or `-90` after verification. The user selected `0`;
independent true-heading checks are still pending.
`MAG_MOUNTING_VERIFIED` and `AZ_ENCODER_ONE_TO_ONE_VERIFIED` deliberately remain
false: the compass moving with the dish does not prove the encoder mapping, and
the chip dot identifies pin 1 rather than dish-forward. A labelled installed
photo and a measured encoder/motor direction check are still required. The
opposite `37.8°` stop remains assumed; no travel was expanded.

The safe sequence is: motor power disconnected and E-stop held; manual XYZ
fixture calibration (`magcal begin` / `magcal finish`); verify persisted data,
mounting, encoder scale/sign and actual level; independently check true north;
then separately approve powered interior Point, repeatability, blocked-target,
timeout and E-stop tests. See [the supervised checklist](../../../hardware/magnetometer-test.md).
Do not set verification flags merely to bypass unavailable calibration or a
failed physical check. This revision is not approval to energise hardware.

Raw mechanical travel stays `137.8° → 360°/0° → 37.8°`. Displayed true AZ and the
allowed arc use the same frozen reference during active movement; a stable idle
refresh may update both without motion. Completed AZ Points stay stopped until a
new command. Alignment remains marked unverified in metadata/UI.

TODOs only: ASTT-055/044/050 cover CRITICAL EL connection, zero/direction/feedback,
travel/stopping qualification; ASTT-091 is LATER HIGH automatic recovery;
ASTT-036/037/038 are LATER HIGH permanent mounting/enclosure with teammates.
No EL implementation, automatic recovery or enclosure work was added. Progress
remains **38/84 complete**; physical ASTT-043/047 acceptance is still open.

### Exact files changed before the temporary-mode follow-up

These are this task's changes, not the entire pre-existing dirty worktree.

```text
hardware/wemos_lilon32/wemos_lilon32.ino
hardware/wemos_lilon32/mag_calibration.h                         [removed; helpers now in .ino]
hardware/research/magnetometer-reference/magnetometer-reference.ino [moved unchanged]
hardware/tests/test_azimuth_control.py
hardware/tests/test_mag_calibration.py                          [new]
software/frontend/src/app/components/cam/cam.component.ts
software/frontend/src/app/components/cam/cam.component.html
software/frontend/src/app/components/cam/cam.component.spec.ts
software/frontend/src/app/interfaces/telescope.ts
software/backend/endpoints/commands.py
software/backend/tests/test_telescope_metadata.py
README.md
hardware/README.md
hardware/magnetometer-test.md
software/README.md
agents/work/README.md
agents/work/043-azimuth-reference/prompt.md
agents/work/043-azimuth-reference/completion.md
agents/work/055-elevation-control/prompt.md
agents/work/044-elevation-encoder/prompt.md
agents/work/036-permanent-mounting-enclosure/prompt.md             [new]
agents/work/037-sensor-connector-mounts/prompt.md                  [new]
agents/work/091-repositioning-recovery/prompt.md                  [new]
```

The moved sketch's previous path was
`hardware/wemos_lilon32/mag.new.code.ino`; it no longer sits beside the integrated
sketch because Arduino would concatenate the duplicate globals and setup/loop.

## Historical progress

## Implemented

- Captured one estimated north offset before accepting movement commands.
- Used fresh encoder/compass/MPU data and the existing gyro stationary threshold.
- Kept the offset fixed through Point/Track movement; compass noise cannot
  continuously shift the target.
- Added the offset to reported AZ and subtracted it from requested AZ.
- Preserved raw limits `137.8° → 360°/0° → 37.8°` and raw-encoder routing.
- Published offset/reference/declination through existing telescope metadata,
  retrying publication before enabling motion. No endpoint or schema was added.
- Recorded the previous command ID at startup so saved encoder-only commands
  cannot replay under the new reference. A new command is required after reboot.
- Firmware blocks movement until the reference is available. All pending
  frontend/backend code changes were reverted at the user's request; existing
  metadata storage and Point range validation are preserved.
- Kept stored AZ values unchanged in the panel and graph: no second offset and
  no retroactive change to old history.
- Firmware reports `ON TARGET` only with both measured axes within tolerance;
  the additional frontend arrival-popup work was reverted and is deferred.
- Kept all motor pins, polarity, and raw mechanical bounds unchanged.

## Reference limitations

The user confirms that the magnetometer rotates with AZ and points along the
antenna, but has not verified the labelled sensor axes. They approved proceeding
with the existing convention. `az_alignment_verified` therefore remains false.

The initial fixed declination lookup is superseded by the research quadratic
below. It remains site/date-specific, not a global model or an encoder-zero fallback.

The compass uses factory-centered counts, not measured installed hard/soft-iron
corrections. The earlier automatic 20-second partial-sweep fit has been removed;
it did not establish calibration and could not complete at a stationary startup.
The resulting reference is explicitly a **true-north estimate**, not qualified
absolute pointing. The zero fallback is diagnostic only and cannot enable motion.

## Computer verification

- Host C++ tests execute the actual heading/reference/conversion/routing functions.
- All 129,600 direction pairs preserve the raw forbidden gap; nonzero offsets
  round-trip without changing raw limits or routes.
- Tests cover frozen offsets, stationary/startup retry guards, missing pulses,
  compass read/init failures, missing MPU, saturation, zero horizontal field,
  nonfinite values, cardinal headings, and circular smoothing.
- Eleven committed backend metadata/Point tests pass after reverting all added
  backend tests and the north-readiness guard.
- Angular production build and 11 committed CAM tests pass after restoring
  the frontend code to HEAD. Both frontend and backend code diffs are empty.
- Running backend rebuilt successfully using the existing persistent database
  volume; a read-only telescope API request returned HTTP 200.
- `git diff --check` passes; no credential or local environment values changed.
- Arduino CLI/PlatformIO are unavailable, so no ESP32-target build was run.
- No board was flashed, motor energised, or production command sent by the agent.

## Remaining physical checks

On 2026-10-19 the user reported that the new movement/offset path worked. This
does not independently verify absolute true heading or magnetic calibration.
The control behavior was confirmed by inspection: encoder-visible disturbances
are corrected while Point is active; whole-base yaw or slippage invisible to
the encoder is not corrected because the startup north offset remains frozen.
No automatic compass re-reference was implemented in response to this question.

- Confirm the forward sensor axis and MPU/magnetometer mounting alignment.
- Check at least two separated, reachable headings against an independent
  true-heading reference, with motors disconnected initially.
- Calibrate installed magnetic bias and evaluate nearby motor/steel interference.
- Verify the assumed `37.8°` opposite stop and repeatable stopping accuracy.
- Test Point arrival with both axes wired/calibrated. The current UI popup only
  confirms submission; any future arrival notification needs separate UI work.

ASTT-043 remains unchecked; computer tests do not complete physical calibration.

## Research-model revision, 2026-10-19

- Ran `magnetic-declination-model.py` and `source-position-model.py` headlessly
  using the available research Python environment. Outputs match the user's
  pasted coefficients; the source scripts were left unchanged.
- Added `magneticDeclination(float year)` with the exact generated quadratic
  coefficients, and `currentDecimalYear()` from UTC. No extra MCU library.
- The magnetic fit uses `(-33.944440°, 18.479819°)`, altitude `6 m`, reference
  year 2026. WMM comparison covers 2026–2027; an unsynchronised/out-of-window
  clock falls back to 2026.0 rather than extrapolating silently.
- Applied the equation in compass-heading calculation and published metadata.
  Existing startup offset capture, raw limits, motor feedback, and source
  tracking calculations are otherwise unchanged.
- Research errors reproduced: 2026 MAE `0.00000001°`, maximum `0.00000004°`;
  2027 MAE `0.00000091°`, maximum `0.00000259°`. These are double-precision
  agreement with WMM projections, not measured compass accuracy. Host tests
  check the MCU float equation against a double oracle within `0.0001°`.
- `software/backend/endpoints/commands.py` now matches its committed version:
  only the uncommitted north-readiness guard was removed. No backend magnetic
  declination calculator existed. Remaining added backend tests were later reverted too.
- Read-only persistent-database verification found Sun ID 1 with normal-time
  coefficients: `m_1=0.064167`, `m_2=0.065703`, `c_1=18.90456`, `c_2=18.69117`,
  `T_ra=182`, `A=23.259528`, `phi=-1.389855`, `D=0.378026`, `T_dec=58.134657`.
  These are not the newly printed fast coefficients; no database record was changed.
- The research fast output compresses one year into 30 minutes. Its minute
  units and zero-based/noon time origin are not compatible with simply replacing
  coefficients consumed by the existing real-day firmware calculation.
- The backend was stopped during this check; its persistent database was read
  through an in-memory snapshot without starting containers or changing data.
- No source commands were posted, firmware flashed, or changes committed.

## Hardware-only cleanup

- Restored all frontend/backend code and tests to committed HEAD at the user's
  request. No UI dependency on `az_reference` or `az_alignment_verified` remains.
- Retained the already-committed range/offset handling and existing readings/chart.
- Corrected research filenames to `magnetic-declination-model.py` and
  `source-position-model.py`; SHA-256 checks confirm both contents are unchanged.
- Updated documentation references. Firmware reference logic was not changed
  by this cleanup, and no running service or database was modified.
