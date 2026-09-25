# ASTT-042 progress notes

**Status:** Needs bench calibration

## Implemented

- Read base roll and pitch from the fixed `0x68` MPU6050.
- Read moving pitch from the elevation `0x69` MPU6050.
- Calculate relative elevation as moving pitch minus base pitch plus the configured zero offset.
- Require valid readings from both MPUs before moving the elevation motor.
- Keep Point and Track on the existing shared elevation target path.
- Report base, moving, and relative angles separately over serial.

## Verification

- Relative-angle examples passed for positive and negative base tilt.
- The 0-90 degree clamps passed their static examples.
- `git diff --check` passed.
- Arduino CLI and PlatformIO are not installed, so firmware compilation was not run.
- No hardware was flashed, powered, or moved.

## Remaining physical checks

- Align both MPU measurement axes.
- Confirm `EL_MPU_SIGN` with the real mounting direction.
- Measure and set `EL_ZERO_OFFSET` at physical zero elevation.
- Compile, then bench-test with the motor mechanically disconnected.
