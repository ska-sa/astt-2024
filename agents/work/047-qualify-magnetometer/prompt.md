# ASTT-047: Qualify magnetometer and heading measurements

**Status:** Ready for bench measurements
**Area:** Hardware and calibration

## Context

The firmware now tilt-compensates the magnetometer and uses it to correct the
azimuth encoder's true-north offset only while stationary. Physical readings
are required before this heading can be trusted for Point or Track movement.

## Goal

Measure heading error and repeatability at known directions with motors off,
then repeat near the installed motor hardware to identify magnetic interference.

## In scope

- Confirm the magnetometer and `0x68` MPU axis orientation.
- Calibrate by rotating the azimuth platform through a full circle.
- Record encoder, corrected azimuth, magnetometer, gyro Z, roll, and pitch at
  north, east, south, and west.
- Repeat the measurements to calculate maximum error and repeatability.
- Compare motor-disconnected readings with installed-system readings.
- Adjust declination and heading offset only from measured results.

## Out of scope

- Energising motors before the E-stop and motion limits are verified.
- Using the magnetometer directly as the motor-loop feedback sensor.
- Marking qualification complete without physical measurements.

## Acceptance criteria

- [ ] Magnetometer and MPU axes are recorded.
- [ ] Calibration completes using a full azimuth rotation.
- [ ] N/E/S/W measurements are recorded for at least three runs.
- [ ] Maximum heading error and repeatability are calculated.
- [ ] Magnetic interference near the installed hardware is recorded.
- [ ] Final declination and heading offset are documented.
- [ ] The user-approved accuracy limit is met.
- [x] No motor movement is required for the initial test.

## Likely files

- `hardware/magnetometer-test.md`
- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `agents/work/047-qualify-magnetometer/completion.md`

## Verification

Follow `hardware/magnetometer-test.md` and retain the measured values.
