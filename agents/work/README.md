# Work-item records

Create one folder per non-trivial task:

```text
agents/work/NNN-short-title/
├── prompt.md
└── completion.md
```

Use the existing `ASTT-NNN` number from the root checklist. The next number for
a new, unlisted item is **097**. Current project progress is **41/89 complete**.

## Current plan — 2026-10-30

**Today: reliable encoder-feedback AZ + EL movement. No automatic north-finding.**

- Operator confirms restored master `2ca62bc` still gives working AZ.
- **IN PROGRESS CRITICAL:** [044 EL encoder/stops](044-elevation-encoder/prompt.md):
  GPIO35 reading/UI accepted; physical stop measurements remain pending, then
  [042 EL midpoint zero](042-elevation-reference/prompt.md), with 051 safety.
- **DONE:** [055 basic EL Point movement](055-elevation-control/completion.md),
  operator confirms both directions work.
- **TODO HIGH:** [096 faster EL motor](096-faster-el-motor/prompt.md), with loaded
  speed/torque, driver compatibility and stopping checks after replacement.
- **TODAY CRITICAL:** [094 signed mechanical midpoint coordinates / both axes](094-encoder-mechanical-coordinates/prompt.md).
  Preserve raw AZ limits; signed validation must match the recorded zeros.
- Test axes separately (049/050), then together under 059/
  [078 mechanical demo](078-integrated-point-track-demo/prompt.md), including
  return to `(0°, 0°)`, limits, feedback faults and E-stop.
- **IN PROGRESS HIGH:** [036 rear electronics enclosure](036-permanent-mounting-enclosure/prompt.md)
  and [037 phone holder on AZ gear](037-sensor-connector-mounts/prompt.md).
- **TODO HIGH:** [095 front laser distance-meter mount](095-front-distance-meter-mount/prompt.md).
- **AFTER MOTION:** [060 three-point triangle validation](060-three-point-validation/prompt.md),
  with 061–068 measurements/error and needed calibration; then 076/
  [077 whole-system script](077-system-presentation-script/prompt.md) and 079 rehearsal.
- **LATER / time permitting:** 047 MPU/magnetometer fitting and automatic references.
  Current noisy sensors do not gate mechanical Point. Manual alignment/levelling
  remains possible later; no absolute accuracy is claimed for midpoint zeros.

Saved all tracked/untracked local edits in `stash@{0}`:
`2026-10-30 before encoder-first AZ-EL milestone`, full object
`be08154f22328b75ad8d6ac8f3b441dfa855fed8`. Ignored files were not included.
Restored only previous backlog/work records before updating this plan. Application
code was restored to master. EL reading/UI was accepted and pushed as `4da6e3c`;
the subsequent EL motion patch is operator-tested and approved for commit/push. Only ASTT's
backend was restarted with approval, retaining its database. No agent-operated
motion or hardware flash.

## Earlier manual-AZ result

ASTT-043 remains accepted for the previous manual AZ demo (midpoint 267.8°,
wrapped display 0/90/275). Signed coordinates are new work under ASTT-094, not
an assertion that the current API already accepts negative angles. Earlier
MPU-only EL setup work is stashed/superseded by the new encoder-first plan.
Neither software tests nor ticket creation qualify physical EL or accuracy.

## Software verified 2026-10-22

- [ASTT-093: Continuous AZ feedback and live device status](093-continuous-az-motion/completion.md)
  — HTTP worker, minimum AZ PWM 210, live measured AZ and gray stale-device
  rows; powered smoothness/stopping remains pending, so the checklist stays open.
  Earlier compass-derived display was superseded by the accepted manual encoder reference.
- [ASTT-092: Remote reading diagnostics and sensor health](092-reading-diagnostics/completion.md)
  — optional reading log, truthful health/status, collapsed diagnostics, and
  preserved database verified; user still uploads the revised firmware.

## Follow-ups prioritised 2026-10-22

- **DONE (2026-10-30):** [ASTT-055: Basic EL Point movement](055-elevation-control/completion.md).
  ASTT-044 encoder calibration and ASTT-050 physical qualification remain open.
- **LATER HIGH:** [ASTT-091: Recovery after external repositioning](091-repositioning-recovery/prompt.md)
  — deferred; a completed Point must stay stopped in the current AZ work.
- **LATER HIGH:** [ASTT-036: Permanent mounting/enclosure](036-permanent-mounting-enclosure/prompt.md),
  [ASTT-037: Sensor/connector mounts](037-sensor-connector-mounts/prompt.md), and
  ASTT-038 assembly, coordinated with teammates.

## Follow-up logged 2026-10-20

- [ASTT-090: Low-power motor hum and bounded startup assistance](090-motor-startup-power/prompt.md)
  — planning only; confirm stall protection and power limits before implementation.

## Software verified 2026-10-19

- [ASTT-084: UI hold-position button](084-ui-stop/completion.md) — frontend tests
  and production build passed; not a physical E-stop or hardware qualification.

## Follow-ups logged 2026-10-19

- [ASTT-086: Single-use sign-in codes](086-passwordless-login/prompt.md)
- [ASTT-087: Device-owner viewer access](087-device-viewer-access/prompt.md)
- [ASTT-088: Compressed Sun replay and tracking-error records](088-compressed-sun-tracking/prompt.md)
- [ASTT-089: MPU manual-level indicator](089-base-level-indicator/prompt.md)

Basic EL Point movement under ASTT-055 is accepted. Remaining work uses ASTT-042
(relative zero), ASTT-044 (stop measurements), ASTT-050 (qualification) and
ASTT-096 (faster motor).
No new capability is marked complete merely by logging these drafts.

### EL reading acceptance and next test — 2026-10-30

Reading/UI cleanup and the minimal-UI AI rule were pushed as `4da6e3c`. The next
ASTT-055 movement patch is operator-confirmed: GPIO35 encoder feedback,
EL Point moves through to the encoder target, fixed `EL_ENCODER_OFFSET=0`, **Elevation
Angle** display. Physical power-cut limit switches are confirmed; measure their
encoder values before adding software travel limits/midpoint coordinates. Software
checks pass; basic direction/movement is accepted. Quantified stopping and
coordinated movement remain qualification work.
