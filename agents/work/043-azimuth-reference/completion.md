# ASTT-043 progress notes

**Status:** Needs bench calibration

## Implemented

- Added roll/pitch compensation to the magnetometer heading.
- Added an encoder-to-true-north offset.
- Kept encoder feedback in the fast azimuth motor loop.
- Converted true Point/Track targets into mechanical encoder coordinates.
- Kept blocked-zone path checks in encoder coordinates.
- Used gyro Z and idle motor state to reject heading corrections while moving.
- Kept encoder-only control as the fallback before a valid north reference.

## Verification

- Checked 0/360 degree conversion and shortest-angle helper logic.
- Checked that missing MPU or magnetometer data skips reference correction.
- Checked that no pin assignments or command payloads changed.
- Firmware compilation was not run because Arduino CLI and PlatformIO are absent.
- No hardware was flashed, powered, or moved.

## Remaining physical checks

- Calibrate magnetometer X/Y while the motors are disconnected.
- Confirm MPU and magnetometer axis directions.
- Confirm magnetic declination and heading offset at the installation site.
- Measure the encoder angles for the real cable/hard-stop blocked zone.
- Test near the installed L298, motors, and steel before trusting true heading.
