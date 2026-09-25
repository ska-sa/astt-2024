# ASTT-055 completion notes

**Status:** Needs hardware verification

## Implemented

- Added independent MPU6050 reads at addresses `0x68` and `0x69`.
- Added L298 channel-B control on GPIO32, GPIO33, and GPIO18.
- Added Point and Track elevation targets with a 0–90 degree limit.
- Stopped elevation movement when feedback is missing or E-stop is active.
- Reserved GPIO35 for a future elevation encoder without using it.

## Verification

- Checked the Point field against the backend schema: `target_el_angle`.
- Confirmed the proposed pins do not overlap the current firmware pin map.
- Confirmed both I2C addresses are distinct.
- Confirmed the source elevation calculation feeds the Track target.
- Firmware compilation was not run because Arduino CLI and PlatformIO are absent.
- No hardware was flashed, wired, powered, or moved.

## Remaining hardware checks

- Confirm the proposed pins against the final physical wiring.
- Calibrate `EL_MPU_SIGN` and `EL_ZERO_OFFSET` for the mounted MPU orientation.
- Compile the firmware when an Arduino toolchain is available.
- Bench-test MPU readings and motor direction with the motor mechanically disconnected.
