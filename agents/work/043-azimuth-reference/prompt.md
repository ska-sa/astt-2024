# ASTT-043: Calibrate the azimuth encoder to true north

**Status:** Done 2026-10-23 — operator accepts manual AZ demo reference; quantitative qualification deferred
**Area:** Hardware and integration
**Priority:** NOW | CRITICAL

## Current demo scope — 2026-10-23

This manual-initial-alignment request supersedes the automatic compass-reference
choices below. Preserve that earlier work as history, not as the active contract.

- Use `USE_MANUAL_AZ_REFERENCE = true`. Keep compass initialization, retry,
  readings and declination calculations as diagnostics; they cannot replace the
  manual offset or block manual Point when unavailable. Celestial Track still
  needs real UTC time.
- The operator confirms both raw stops (`137.8°`, `37.8°`) and clockwise 1:1
  encoder mapping. The permitted arc spans 260° through zero. Its midpoint is
  `norm360(137.8 + 260 / 2) = 267.8°`, not the ordinary average of the stops.
- The operator manually places AZ at that midpoint, levels the base and turns
  the whole base so the pointing direction faces true north using an independent
  reference. Never centre or zero with motors at startup.
- Keep configurable `encoderAtNorth` fixed at the chosen alignment position:
  `offset = norm360(-encoderAtNorth)`, measured AZ is
  `norm360(rawEncoder + offset)`, and raw target is
  `norm360(trueTarget - offset)`. Never capture the current boot position as north.
- Report `MANUAL_ALIGNMENT`; keep compass heading separate from encoder-derived
  AZ. Operator confirmation does not certify absolute pointing accuracy.
- Preserve pins, Point/Track schemas and calculations, networking, raw safe
  routes, E-stop, timeouts and command-ID protections. No old-command restart.
- Latest operator decision supersedes the initial confirmation-button requirement:
  assume phone-assisted levelling/north alignment is completed before a new
  command. Add no UI buttons, calibration login/state errors or alignment gate.
  This is an operator precondition, not something the firmware can verify.
  After base repositioning, stop, realign and send a new command; base movement
  is not detected automatically. Serial prints diagnostics as before, and the
  app retains magnetic readings and Show more. No Serial interaction commands.
- Inspect the working compass sketch, but retain one sensor instance, shared
  I2C initialization, `setup()` and `loop()`. Do not import an automatic tumble
  calibration or duplicate Arduino entry points into the integrated sketch.
  The selected working source was `hardware/wemos_lilon32/magnetomet code only.ino`,
  now retained separately as `hardware/research/magnetometer-live-test/magnetometer-live-test.ino`;
  its continuous-mode initialization, bounded retry and field reads are reused.
  Do not copy its demo date fallback into celestial Track or declination logic.
- EL and all other requested tickets are log-only in this revision, per the
  operator's latest instruction; do not implement ASTT-055 now.
- No agent flashing or powered movement. After successful operator AZ tests,
  the user explicitly authorized committing and pushing the verified AZ work
  on 2026-10-23; keep subsequent EL implementation separate.

### Demo acceptance criteria

- [x] Manual offset and inverse conversion pass wraparound/safe-arc checks.
- [x] Startup never moves or reinterprets the current encoder angle as north;
  commands saved before startup/E-stop cannot restart movement. Manual alignment
  is documented as an operator precondition, with no new confirmation control.
- [x] Missing compass/declination cannot overwrite or disable a valid manual
  reference; Track without real UTC cannot move.
- [x] Compass lifecycle is shared and metadata/UI/logs distinguish manual AZ
  from magnetic diagnostics without claiming automatic north or accuracy.
- [x] Existing route, command replay, E-stop and timeout tests pass; build and
  changed files are recorded separately from the log-only ASTT-055 follow-up.
- [x] Operator accepts functional manual-reference behavior: Point 0° is the
  midpoint, 90° is to the right and 275° to the left. No numerical accuracy or
  independent stopping-time measurement is claimed. Per the user's closure
  decision, quantitative accuracy/calibration remains ASTT-046/047/049/051,
  rather than blocking this manual-demo reference task.

## Current approved revision — 2026-10-22

### Latest user-approved simplification

The user requests removal of the teammate calibration machinery and temporary
mode/gate complexity. This supersedes the earlier strict/test-mode workflow:

- Raw factory-centered `atan2(Y, X)` + selected 0-degree mounting + existing local
  declination; no calibration structs, flash storage, serial capture or modes.
- No MPU calibration/frame/verification gate for AZ. Keep the actual compass
  level; heading accuracy and existing encoder mapping remain unqualified.
- Retain stopped stable reference capture, fixed in-command offset, raw limits,
  E-stop, timeout and no replay/restart of completed commands.
- Metadata publication is best effort, not a gate for command polling or Point.
  UI/backend retain numeric raw-arc checks, not calibration-state checks.
- Remote one-line reading diagnostics/actual health are ASTT-092. Proper magnetic
  calibration remains pending under ASTT-047; no agent flashing or movement.

This revision supersedes the historical implementation decisions below:

- Audit the teammate's heading convention; separate per-axis magnetic calibration,
  mounting rotation, fixed-site declination, and the encoder-to-north offset.
- Require versioned, validated calibration on boot. Explicit `magcal begin`,
  `magcal finish`, and `magcal cancel` control manual capture only, with E-stop
  held and motor power disconnected. No automatic or assisted motor sweep.
- Collect extrema throughout capture; reject inadequate XYZ spans/coverage,
  invalid/saturated samples and bad persisted coefficients. Preserve an existing
  valid calibration on failure. Save only a successful explicit capture.
- Retain the exact fixed-site polynomial for 2026–2027. Unsupported or missing
  UTC time makes declination unavailable, not an undocumented fallback.
- Do not assume encoder direction/gearing from the magnetometer's mounting.
  The user confirmed the magnetometer rotates with the dish, not the encoder
  ratio. Default encoder/mounting verification flags stay false pending checks.
- Use actual stopped-motor state plus stable encoder/compass readings before
  acquiring or refreshing the reference. Do not apply base-MPU tilt angles to
  an unverified rotating sensor frame; level-only operation is explicit.
- Freeze the reference during an active AZ Point/Track. Latch AZ Point completion:
  a new idle reference or repeated command ID cannot re-arm that Point. Same-ID
  polls remain a communication heartbeat, with a 10-second timeout and no resume.
- Keep the raw encoder arc and safe-route logic unchanged; convert true AZ
  before limit checks, including north inside a blocked arc.
- Minimum UI/backend readiness and metadata refresh are now explicitly in scope.
  A refresh never posts motion; alignment remains unverified. Preserve Tesla API
  data, microtesla display, history, networking and source calculations.
- Update the existing TODOs for EL and permanent mounting; log automatic
  repositioning recovery separately without implementing those features.
- No board flashing, physical motor action, commit, merge, or push.

### User-approved single-file follow-up

- Put all integrated firmware and calibration helpers in the main `.ino` for
  Arduino IDE copy/paste; remove the redundant project header.
- Preserve existing safety, persistence, reference, source and networking logic.
- Retain the selected 0-degree mounting correction and existing verification gates.
- Use serial recalibration rather than adding UI controls. Reboot reloads saved
  calibration; it is not a replacement for collecting calibration samples.
- Recompile for LOLIN32 and run both hardware host suites; no flashing or commit.

### Revision acceptance checks

The later user-approved temporary mode below supersedes mandatory calibration
gates only while its explicit flag is enabled. Qualification stays pending.

- [x] LOLIN32-target compile and focused host/backend/frontend checks pass.
- [x] Wrapping, invalid calibration/storage, stable acquisition, blocked targets,
  repeated IDs, communication timeout and completion latching have checks.
- [x] Rate-limited diagnostics and a supervised checklist are documented.
- [x] The exact changed-file list and remaining physical checks are reported.
- [ ] Physical mounting, encoder mapping, calibration accuracy, limits and E-stop
  are qualified by the operator; the software checks do not establish these.

### User-approved temporary uncalibrated compass mode

- User confirms a flat compass, Z outward, selected mounting correction 0°.
- Enable explicit `AZ_COMPASS_TEST_MODE`: use valid saved calibration when
  available, otherwise factory-centered magnetic direction plus local declination.
  Never invent coefficients or claim calibration/mapping/alignment passed.
- Remove the base-MPU/gyro/level dependency only in this manually level mode;
  strict mode retains its prior requirements. This is not tilt compensation.
- Preserve stable stopped acquisition, frozen active reference, raw mechanical
  limits, E-stop, timeout and no replay/restart of completed Points.
- Permit the exact explicit mode in CAM/backend with an uncalibrated warning;
  no button/endpoint/schema/source/EL changes. Defer real calibration to ASTT-047.
- Compile and check both modes. No flashing, commit, merge or push.

## Historical implementation scope

The remainder records earlier work, not the current calibration/readiness contract.

## Context

ASTT-085 established working encoder-only Point movement. The raw allowed arc
is `137.8° → 360°/0° → 37.8°`; the opposite stop is still assumed. Movement,
displayed AZ, and history used a fixed zero encoder offset before this revision.

The next change restores a true-north reference without changing that raw
mechanical range. The magnetometer supplies magnetic heading; site/date-specific
declination converts it to true heading. Location alone cannot determine the
antenna's orientation or its encoder-to-north offset.

## Goal

Use one stable encoder-to-north offset for Point/Track targets, new telemetry,
and the displayed allowed range, while retaining raw-encoder motor feedback
and limit checks.

## In scope

- Reuse the installed sensor libraries and standard trigonometry; add no new
  third-party dependency or runtime geomagnetic-model service.
- Reuse tilt compensation only with valid, fresh MPU and magnetometer data.
- Use factory-centered magnetic readings as an explicit estimate, not a claim
  of installed hard/soft-iron calibration.
- Evaluate the user's research quadratic with decimal UTC year on the MCU;
  do not add a backend geomagnetic calculator or runtime WMM dependency.
- Establish `offset = normalize(true heading - raw encoder)` while stationary,
  before accepting a command. Keep the offset fixed during movement.
- Report `normalize(raw encoder + offset)` and convert requested true azimuth
  back using `normalize(requested azimuth - offset)`.
- Leave raw limits, route selection, motor pins, and E-stop behavior unchanged.
- Publish the active offset through existing telescope metadata for the
  already-committed UI range checks; reload CAM after flashing.
- Post corrected readings through the existing API without adding another UI
  offset or rewriting old history. No frontend/backend code change is included.
- Explain site declination, sensor mounting alignment, and encoder offset as
  separate quantities, including the fallback's calibration status.

## Out of scope

- Physical sensor calibration, stopping qualification, or measuring the assumed stop.
- Guessing a mounting offset or claiming an uncalibrated fallback is true north.
- Recalculating old history using the current offset.
- A new API endpoint, new geomagnetic library, motor-pin change, or agent-driven
  flashing/movement.
- Frontend reference/alignment flags, new UI readiness gates or arrival popups,
  and backend runtime/test changes. These pending changes were explicitly reverted.

## Decisions and questions

- Confirmed: use the encoder for motion and the magnetometer only to establish
  its north reference. Raw mechanical limits remain unchanged.
- Confirmed: default site is latitude `-33.944481°`, longitude `18.478685°`.
- The fixed `-26.8541°` lookup is superseded by the user's research fit for
  `(-33.944440°, 18.479819°)`, altitude `6 m`, compared with WMM for 2026–2027.
  The user approved hardcoding its coefficients on 2026-10-19. Decimal UTC year
  drives the equation; January 2026 is the explicit unsynchronised/out-of-window
  fallback, not a new encoder offset or a global declination model.
- Confirmed by the user: the magnetometer rotates with AZ and is mounted to
  point along the antenna's intended pointing direction.
- Still unverified: which labelled sensor axis (`+X`, `+Y`, `-X`, or `-Y`) points forward?
  The user has not verified axis alignment. The existing heading expression
  with `headingOffset = 90°` is equivalent to `atan2(horizontalY, horizontalX)`
  modulo `360°`; the numeric `90°` is not itself a verified mounting correction.
  A photo of the axis markings and antenna-forward direction can resolve this.
- Earlier logs showed compass heading near `195°` while the encoder changed by
  approximately `72°`; the cause is not established.
- Open: no verified fixed encoder-to-north fallback is recorded. Existing
  declination `-25.6°` is not an encoder offset. Do not reuse historical changing
  offsets as a calibrated fallback.
- Implemented fallback: zero remains diagnostic only. Without a fresh sensor
  reference and successful metadata publication, motion waits rather than
  silently treating encoder zero as north. No measured backup offset is invented.
- Calibration must respect the `260°` travel arc. The old full-rotation bench
  instructions must not be followed on the travel-limited assembly.
- The user explicitly approved execution while alignment remains uncertain.
  Retain the existing axis convention, mark the result `true_north_estimate`,
  and keep `az_alignment_verified = false` until physically checked.
- Capture the previous latest command ID before publishing readiness. A new
  command is required after reboot; old encoder-frame commands are not replayed.
- Remove the unqualified 20-second partial-sweep fit rather than calling that
  installed magnetic calibration. No motion or full rotation is performed.
- Revert the pending backend north-readiness guard, preserving committed
  metadata storage and Point limit validation. Keep reference readiness in firmware.
- The user subsequently requested a hardware-only change: all pending frontend
  and backend code/tests were restored to committed HEAD, including the added
  flags, UI status/gates, arrival popup, and automatic metadata/history refresh.
- Rename research files only; keep their contents byte-for-byte unchanged.

## Acceptance criteria

- [x] User authorizes implementation using the existing, explicitly unverified axes.
- [x] A stationary reference estimate is captured without shifting an active command.
- [x] A true-azimuth Point target and measured AZ use the same inverse conversions.
- [x] Existing raw limits and safe route tests pass with nonzero offsets.
- [x] Research coefficients reproduce on rerun and the MCU equation/date conversion pass host tests.
- [x] Missing, stale, or invalid readings cannot establish the reference; uncalibrated readings are never labelled verified north.
- [x] Existing UI range handling remains intact without new reference/alignment flags.
- [x] Live readings and future history are corrected exactly once; old rows are unchanged.
- [x] Unrequested frontend/backend changes are reverted; arrival-popup work is deferred.
- [x] Relevant host/backend/frontend checks pass; physical calibration stays pending.
- [x] No agent-driven hardware action occurs and documentation is updated.
- [ ] Sensor alignment and installed magnetic calibration are physically verified.

## Likely files

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/tests/test_azimuth_control.py`
- `hardware/README.md`
- `agents/work/043-azimuth-reference/completion.md`

## Verification

- Host tests for nonzero offsets, 0/360 wrapping, invalid reference data, and
  unchanged raw-limit routing.
- Existing isolated backend metadata/Point tests and focused frontend tests.
- Angular production build; ESP32 compilation if board tooling is available.
- User-operated physical checks against an independent true-heading reference,
  away from magnetic interference and without crossing physical stops.

## Reference

[NOAA magnetic declination](https://www.ngdc.noaa.gov/geomag/declination.shtml)
defines declination as location/time dependent and specifies adding it to the
magnetic bearing to obtain a true bearing.

Current fitted-model source: `hardware/research/magnetic-declination-model.py`.
The earlier NOAA one-date lookup is historical; no online lookup is needed by firmware.
