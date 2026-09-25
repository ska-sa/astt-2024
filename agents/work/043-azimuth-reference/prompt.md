# ASTT-043: Calibrate the azimuth encoder to true north

**Status:** Needs bench calibration
**Area:** Hardware and integration

## Context

The azimuth encoder gives fast, repeatable mechanical position but does not
know true north by itself. The magnetometer gives an absolute north reference
but is noisier and can be disturbed by motor current and nearby steel. The
existing MPU6050 supplies base tilt and azimuth gyro rate.

## Goal

Use the encoder for closed-loop movement, correct its zero reference from a
tilt-compensated magnetometer heading, and use gyro rate to decide when the
antenna is still enough to accept a magnetometer correction.

## In scope

- Calculate roll and pitch from the azimuth-platform MPU6050 accelerometer.
- Tilt-compensate the magnetometer heading for small levelling errors.
- Establish an encoder-to-true-north offset from a valid magnetometer heading.
- Correct the offset slowly only while azimuth is stationary.
- Convert true-azimuth targets back to encoder coordinates for motor direction
  and blocked-zone checks.
- Keep the encoder as the fast motion feedback source.
- Use gyro Z as a stationary/movement check without integrating it as an angle.
- Document the control model and remaining calibration work.

## Out of scope

- Physical magnetometer calibration or qualification near the motor.
- Final axis sign, heading offset, declination, or blocked-zone measurements.
- Adding physical limit switches.
- Flashing or moving the antenna.

## Decisions and assumptions

- Do not control directly from magnetometer error; it is too sensitive to
  magnetic noise for the motor loop.
- The encoder protects the configured mechanical blocked zone, but it cannot
  replace real limit switches.
- The magnetometer and `0x68` MPU must be mounted with known axis alignment;
  their final signs and offsets require a physical orientation check.
- True-north correction is accepted only after magnetometer calibration and
  while absolute gyro Z rate is below the stationary threshold.

## Acceptance criteria

- [x] Magnetometer heading is compensated using MPU roll and pitch.
- [x] Encoder angle is converted to a true-north azimuth using a stored offset.
- [x] Point and Track targets remain true azimuth values.
- [x] Motor direction and blocked-zone checks use encoder coordinates.
- [x] Magnetometer correction is ignored while rotating.
- [x] Missing magnetometer or MPU data leaves encoder-only fallback control.
- [x] Firmware static checks pass where local tooling allows.
- [x] No hardware is flashed or powered.

## Likely files

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/README.md`
- `agents/work/043-azimuth-reference/completion.md`

## Verification

- Check angular wrap-around at 0/360 degrees.
- Check target conversion preserves the configured encoder blocked zone.
- Compile when Arduino CLI or PlatformIO is available.
- Bench-test far from the L298, motors, steel, and high-current wiring.
