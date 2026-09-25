# ASTT-055: Add elevation feedback and motor control

**Status:** Needs hardware verification
**Area:** Hardware and integration

## Context

The integrated firmware currently controls azimuth through L298 channel A and
reports a placeholder elevation value. Elevation will initially use a second,
horizontally mounted MPU6050 as its position reference because no elevation
encoder is available yet.

The existing wiring diagram is reference-only. The current firmware remains the
source of truth for active pins, including I2C on GPIO21 and GPIO22.

## Goal

Add a small, readable elevation-control path that accepts Point and Track
elevation targets, measures elevation from a second MPU6050, and drives L298
channel B without changing the existing azimuth behaviour.

## In scope

- Use the second MPU6050 at I2C address `0x69` with AD0 tied to 3.3 V.
- Read its accelerometer and calculate an initial 0–90 degree elevation angle.
- Add configurable elevation sign and zero-offset constants for calibration.
- Use GPIO32 for IN3, GPIO33 for IN4, and GPIO18 for ENB/PWM.
- Reserve GPIO35 for a future elevation encoder without using it for control.
- Read Point elevation from `target_el_angle`.
- Use the calculated source elevation during Track mode.
- Stop both motors when E-stop is active.
- Continue posting measured elevation through the existing reading payload.

## Out of scope

- Final MPU mounting-axis and zero calibration.
- Physical wiring, Veroboard layout, flashing, or energising either motor.
- Elevation encoder support.
- Claiming closed-loop elevation qualification without bench testing.

## Decisions and assumptions

- The existing MPU6050 remains at `0x68`; the elevation MPU6050 uses `0x69`.
- The first angle formula assumes the elevation MPU X axis changes with tilt.
  Axis direction and zero offset remain named constants for easy correction.
- Elevation movement is limited to 0–90 degrees in software.
- The proposed L298 and reserved encoder pins must be confirmed against the
  final physical wiring before the Veroboard design resumes.

## Acceptance criteria

- [x] Both MPU6050 devices are addressed independently.
- [x] Point commands update both AZ and EL targets.
- [x] Track commands update AZ and EL targets from the same source calculation.
- [x] Missing elevation feedback prevents elevation movement.
- [x] Software limits prevent motion below 0 or above 90 degrees.
- [x] E-stop stops both L298 channels.
- [x] GPIO35 is documented but unused as the future elevation encoder input.
- [ ] Firmware syntax/build checks pass where local tooling allows.
- [x] No hardware is flashed or powered during this ticket.

## Likely files

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/README.md`
- `agents/work/055-elevation-control/prompt.md`

## Verification

- Check all proposed pins against the LOLIN32 and existing firmware assignments.
- Check I2C addresses `0x68` and `0x69` do not conflict.
- Compile with Arduino CLI or PlatformIO when the toolchain is available.
- Bench-test MPU orientation and motor direction with the motor mechanically
  disconnected before any full movement test.
