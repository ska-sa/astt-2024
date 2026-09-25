# Motor calibration procedure

Calibrate one axis at a time. Do not connect the second motor until the first
axis passes its direction and stopping checks.

## Before applying motor power

- Complete the E-stop checks in `hardware/estop-limit-test.md`.
- Support the antenna so it cannot fall or rotate freely.
- Confirm the configured AZ blocked zone and EL 0-90 degree range.
- Remove the L298 ENA and ENB jumpers when GPIO PWM is connected.
- Keep the physical E-stop within reach.
- Disconnect the motor for the axis that is not being tested.

Current draft values are:

| Axis | Minimum PWM | Maximum PWM | Tolerance | Ramp range |
| --- | ---: | ---: | ---: | ---: |
| AZ | 140 | 255 | 1 degree | 60 degrees |
| EL | 140 | 255 | 1 degree | 30 degrees |

## 1. Direction check

1. Start near the middle of the safe range and record the measured angle.
2. Send a Point target 5 degrees higher than the measured angle.
3. Confirm the measured angle increases. Activate the E-stop immediately if it
   decreases or approaches a hard stop.
4. Send a target 5 degrees lower and confirm the measured angle decreases.
5. Repeat for the other axis only after disconnecting the first motor.

| Axis | Higher target movement | Lower target movement | Pass |
| --- | --- | --- | --- |
| AZ | | | |
| EL | | | |

## 2. Minimum useful PWM

Start below the current draft value and increase in steps of 10. For each value,
command a small safe movement from both directions. The minimum useful PWM is
the lowest value that starts movement reliably without stalling or only humming.
Do not leave a stalled motor powered.

| Axis | Direction | Tested PWM values | Lowest reliable PWM |
| --- | --- | --- | ---: |
| AZ | Increasing | | |
| AZ | Decreasing | | |
| EL | Increasing | | |
| EL | Decreasing | | |

Use the higher result from the two directions for each axis.

## 3. Stopping and overshoot

For each axis, approach the same target from below and above at least three times.
Record the final position after motion stops.

| Axis | Target | Approach | Final 1 | Final 2 | Final 3 | Maximum error |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| AZ | | Below | | | | |
| AZ | | Above | | | | |
| EL | | Below | | | | |
| EL | | Above | | | | |

Increase tolerance or slow-down range only from these measurements. Stop if the
axis oscillates around the target.

## 4. Apply measured values

Update `AZ_MIN_PWM`, `EL_MIN_PWM`, `AZ_TOLERANCE`, `EL_TOLERANCE`,
`AZ_RAMP_RANGE`, and `EL_RAMP_RANGE` from the recorded results. Repeat the
stopping test after every change. Do not mark ASTT-045 complete until both axes
pass and the final values are recorded.
