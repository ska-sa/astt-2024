# ASTT-042 progress notes

**Status:** Historical MPU approach — superseded by encoder-midpoint plan 2026-10-30

The notes below describe the earlier sensor-based draft, not today's requirement.
ASTT-042/044/094 now use recorded encoder limits and their mechanical midpoint;
MPU/magnetometer calibration is deferred. The old checked software work does not
qualify EL zero or physical movement. No code is implemented by this plan update.

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

## Provisional upper-stop offset — 2026-11-03

Operator reports raw upper stop 65.93° and design limits −16° to +93°.
The integrated firmware changes only `EL_ENCODER_OFFSET` from 0 to +27.07°;
existing reading and inverse command conversion apply it once. No software EL
travel limits, scaling correction or changes to sensor readers, MPU levelling,
AZ, motor power, timing, networking or E-stop are introduced.

Assuming positive 1:1 encoder scale:

| Position | Displayed EL | Raw encoder |
| --- | ---: | ---: |
| Reported upper stop | +93° | 65.93° |
| Predicted lower stop | −16° | 316.93° |
| Design zero | 0° | 332.93° |
| Travel midpoint | +38.5° | 11.43° |

The lower stop is a prediction, not a measurement. This trial matches the
explicit upper=93° request; a midpoint-zero scale would instead be ±54.5°.
The operator will measure the lower stop before scale/limits are finalized.

Host regression passes, including 129,600 AZ paths plus checks for upper/lower
conversion, zero, raw versus offset telemetry, EL direction/stopping across
wrap, and no new design-limit rejection. LOLIN32 compilation passes: 1,031,807
bytes flash (78%), 53,980 bytes static RAM (16%). `git diff --check` passes.
No flashing, powered commands, commit or push. Physical reference accuracy and
full ASTT-042 qualification remain pending.

## Selected zero and UI range — 2026-11-03 (superseded)

- Operator selected previous UI 46.7° as zero. With previous offset +27.07°,
  raw zero is 19.63°; current `EL_ENCODER_OFFSET=-19.63` applies it once.
- UI EL entry/initial targets/gauge now use −15° to +92°. Both gauge needles
  are solid triangles. Signed live/history/table angles and wrapped API targets
  continue using the prior conversion; raw logs are preserved.
- Compared with committed master, the entire integrated firmware differs only
  in the EL offset declaration. Sensor readers/timing, MPU levelling, motor
  power/control, AZ and networking remain byte-for-byte unchanged.
- Earlier raw upper stop 65.93° now corresponds to +46.3°. An offset alone cannot
  also make it +92° while keeping raw 19.63° at zero. No scale factor or firmware
  travel bound was added. UI limits are requested bounds, not verified stops.
- Host firmware regressions pass, including zero/inverse mapping, telemetry,
  direction/stopping, all 129,600 AZ paths and existing fault/command checks.
  LOLIN32 compile passes (1,031,807 bytes flash, 53,980 bytes static RAM).
- All 66 focused Angular tests and production build pass. Mocked desktop/mobile
  browser checks pass for range endpoints, negative commands, triangular pointer
  appearance, label bounds, unchanged targets during polling, no horizontal
  overflow and no runtime errors. Existing build warnings remain unchanged.
- No live command, upload, service restart, commit or push. Operator pointing
  accuracy, encoder scale and physical endpoint verification remain pending.

## Operator-confirmed adjustment — 2026-11-04 (current)

Operator adds +90° to the earlier offset: final declaration `-19.63 + 90`,
net +70.37°. They confirm both axes now work and authorize commit/push. Forward
telemetry and inverse command conversion retain this one offset; raw sensor
readings are unchanged. Zero now maps to raw 289.63°, and raw 19.63° reads 90°.
Historical raw upper 65.93° would read 136.3°, so fresh stop/reference/scale
measurements remain required. No software EL limits or invented scale added.
