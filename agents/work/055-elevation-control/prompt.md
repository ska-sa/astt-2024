# ASTT-055: Basic encoder-feedback EL Point movement

**Status:** DONE — operator confirms both directions work, 2026-10-30
**Area:** Hardware | Integration

## Context and goal

Preserve working AZ and make the connected EL motor follow Point targets using
its encoder. The operator confirms the same PWM encoder as AZ on GPIO35, with
physical switches opening motor power, and has now accepted both EL directions.

## Delivered scope

- Existing L298 channel-B pins GPIO26/25/32; no wiring or network changes.
- GPIO35 feedback, displayed Elevation Angle and inverse target conversion use
  the same hardcoded `EL_ENCODER_OFFSET=0` reference.
- `EL_MOTOR_SIGN=-1`, EL PWM 255/255, AZ PWM 210/255. EL continues to its target
  within the configured 1° tolerance; no fixed movement-duration cutoff.
- Keep E-stop, feedback-loss, communication-timeout and no-replay behavior.
- Preserve actual readings separately from commands, with a minimal UI.

## Acceptance

- [x] Operator confirms encoder reading updates in the UI.
- [x] Operator confirms EL movement works in both directions after reversing sign.
- [x] Existing AZ remains working per operator feedback.
- [x] Implementation and operator result are recorded; remaining work is assigned below.

## Remaining scope in separate tasks

This closes the basic Point movement task, not quantitative motion qualification.
Measured stops/software protection remain ASTT-044/051; recorded midpoint zero
ASTT-042; signed coordinates and combined-axis return-to-zero ASTT-094/078;
repeatability, stopping and accuracy ASTT-045/046/050/061–068. Replace the slow
EL motor under ASTT-096. Sensor references and EL celestial Track are deferred.

## Verification

See completion.md for software checks and the dated operator confirmation.
No physical measurements or fault tests are inferred from the user's report.
No additional motor commands, upload, commit or push are part of this status update.
