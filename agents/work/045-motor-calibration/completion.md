# ASTT-045 progress notes

**Status:** Ready for safe bench measurements

## Prepared

- Added a one-axis-at-a-time motor calibration procedure.
- Included checks for direction, minimum useful PWM, overshoot, and stopping.
- Added measurement tables for both movement directions on both axes.
- Kept firmware constants unchanged until physical measurements are available.

## Verification

- Procedure requires ASTT-051 E-stop checks before motor power is applied.
- Procedure keeps the unused axis disconnected.
- No firmware was flashed and no hardware was powered or moved.

## Remaining physical checks

- Verify the E-stop and physical travel limits.
- Measure motor direction and minimum useful PWM for each axis.
- Measure stopping error from both directions.
- Update firmware constants only from the recorded results.
