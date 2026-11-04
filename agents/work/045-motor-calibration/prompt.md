# ASTT-045: Calibrate motor control

**Status:** Ready for safe bench measurements
**Area:** Hardware and calibration

## Context

The firmware can drive both L298 channels and stop from measured AZ and EL
feedback. The current PWM, direction, tolerance, and ramp values are draft values
and have not been measured on the assembled antenna.

## Goal

Measure and configure safe motor direction, minimum useful PWM, stopping
tolerance, and slow-down range for both axes.

## In scope

- Verify the E-stop removes motion before calibration starts.
- Test AZ and EL one axis at a time at low PWM.
- Confirm positive commands increase the matching measured angle.
- Measure the lowest PWM that moves each axis without stalling.
- Measure overshoot when approaching a target from both directions.
- Set separate AZ and EL PWM, tolerance, and ramp constants from measurements.
- Keep the existing AZ blocked zone and EL 0-90 degree range.

## Out of scope

- Automatic PID tuning.
- Changing pins, API schemas, or mechanical limits.
- Running both motors before each axis passes its independent test.
- Bypassing the E-stop or physical travel limits.

## Decisions and questions

- Confirm both motor outputs can be tested with the antenna unloaded or safely supported.
- Confirm the E-stop and physical limits have been checked before applying motor power.
- Record whether each configured positive direction increases its measured angle.
- Record the measured minimum PWM and overshoot for each axis.

## Acceptance criteria

- [ ] E-stop operation is verified before motor testing.
- [ ] Positive AZ and EL directions match increasing measured angles.
- [ ] Minimum reliable PWM is recorded separately for AZ and EL.
- [ ] Overshoot is measured from both directions on both axes.
- [ ] Firmware constants are updated only from recorded measurements.
- [ ] Both axes stop inside the agreed tolerance without oscillation.
- [ ] Documentation and the root checklist are updated.

## Likely files

- `hardware/motor-calibration.md`
- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `agents/work/045-motor-calibration/completion.md`

## Verification

Follow the motor-calibration procedure with one axis powered at a time and retain the measured values.

## Authorized EL-only follow-up — 2026-11-02

After confirming master sensor readings are reliable, the operator requests EL
minimum/maximum PWM together at 255 and the earlier 0.01° tolerance. Keep AZ,
sensor code and timing unchanged. Stop on EL target crossing to avoid chasing
a sample that skipped the tiny tolerance. No automatic hold or other refactor.

## Faster EL motor trial — 2026-11-03

Operator reports EL now moves faster and requests EL minimum PWM to match
current AZ minimum (210). Change EL minimum only; retain maximum 255, existing
ramp, tolerance, reference, sensor readers and all AZ settings.

## Authorized AZ-only follow-up — 2026-11-04

Keep the operator's AZ minimum/maximum 140/255 and 0.1° tolerance; preserve EL
settings (currently 128/255, 0.01°) and all sensor sampling. Improve AZ arrival
and continued encoder-based holding with small near-target corrections and
settling before reversal. Add speed/error to existing Serial/API diagnostics.
Round CAM target inputs to two decimals. No automatic power boost in this trial;
use the logs for minimum-power tuning. No flash, powered commands, commit or push.
Operator tests must confirm repeatable stopping before further tolerance changes.
