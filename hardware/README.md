# ASTT Hardware

The hardware subsystem contains firmware experiments and the integrated telescope
controller. The current integrated target is:

```text
hardware/wemos_lilon32/wemos_lilon32.ino
```

Older sketches remain as reference implementations. Do not assume their pins,
telescope IDs, or API hosts match the current assembly.

## Current system

The integrated firmware connects over Wi-Fi, posts readings, polls Point and
Track commands, reads the AZ encoder, magnetometer, and GPS, and controls the AZ
motor with E-stop handling. A firmware-only EL control draft uses a second
MPU6050 for feedback and L298 channel B. It still needs wiring, calibration, and
bench testing before use.

Use encoder feedback for motion control and the magnetometer as an absolute
heading/calibration reference. Elevation uses accelerometer-derived tilt because
a gyro alone will drift.

### Control pin map

| Signal | LOLIN32 pin | Note |
| --- | --- | --- |
| L298 IN1 | GPIO14 | Azimuth direction |
| L298 IN2 | GPIO27 | Azimuth direction |
| L298 IN3 | GPIO26 | Elevation direction |
| L298 IN4 | GPIO25 | Elevation direction |
| L298 ENA | GPIO33 | Azimuth PWM; add a 10 kOhm pull-down |
| L298 ENB | GPIO32 | Elevation PWM; add a 10 kOhm pull-down |
| Future EL encoder | GPIO35 | Reserved input only; not used by firmware |
| I2C SDA | GPIO21 | Shared sensor bus |
| I2C SCL | GPIO22 | Shared sensor bus |

The physical header sequence is:

```text
GPIO: 13    12    14   27   26   25    35    34    33   32
Use:  free  skip  IN1  IN2  IN3  IN4   skip  skip  ENA  ENB
```

This keeps all four direction signals consecutive and places both enable signals
together elsewhere on the same header side. It avoids boot-strapping GPIO12 and
input-only GPIO35/GPIO34. Keep both enable pull-downs fitted so the motors stay
disabled while the MCU starts.

Keep the original MPU6050 at address `0x68`. Tie the elevation MPU6050 AD0 pin
to 3.3 V so it uses address `0x69`.

The firmware names the L298 channel-A pins `AZ_IN1`, `AZ_IN2`, and `AZ_ENA`.
Channel-B pins are `EL_IN1`, `EL_IN2`, and `EL_ENA`; these map to the L298
module labels IN3, IN4, and ENB. The old potentiometer input has been removed.

### Elevation reference model

The fixed `0x68` MPU measures the azimuth platform pitch. The moving `0x69` MPU
measures the elevation assembly pitch. The firmware removes the remaining base
tilt before controlling elevation:

```text
relative elevation = moving MPU pitch - base pitch + zero offset
```

Both MPUs must return valid readings before the elevation motor can move. Mount
their measurement axes in the same direction, then bench-test the configured
sign and zero offset before enabling the motor.

### Azimuth reference model

Use both the encoder and magnetometer, but give them different jobs:

- The **encoder** is the fast feedback used to move and stop the azimuth motor.
  Its mechanical angle is also used for the configured cable/hard-stop blocked
  zone.
- The **magnetometer** supplies the absolute true-north reference. While the
  mount is stationary, it slowly corrects the encoder's true-north offset.
- The azimuth-platform **MPU6050 accelerometer** supplies roll and pitch so a
  small manual levelling error can be removed from the magnetometer heading.
- The azimuth-platform **MPU6050 gyro Z rate** tells the firmware when azimuth
  is moving. The gyro is not integrated into an angle because its bias would drift.

Mount the magnetometer and `0x68` MPU rigidly on the azimuth platform with known
axis alignment and the MPU Z axis vertical. The `0x69` MPU moves with elevation.

The control calculation is:

```text
true azimuth = encoder angle + north offset
encoder target = requested true azimuth - north offset
motor error = shortest encoder-angle difference to encoder target
```

Do not drive directly from magnetometer error. Motors, steel, and current can
disturb the magnetic heading. Also, an encoder only avoids a configured
blocked range; it does not detect a physical limit switch. Physical limit
switches and a power-cutting E-stop are still recommended.

GPIO23 is an active-low E-stop status input. While it is LOW, firmware stops both
channels and clears the current Point/Track targets. Releasing it does not resume
motion until a fresh command arrives. This status input is not a replacement for
a normally closed E-stop that directly removes motor power.

## Hardware work groups

### Electronics and sensors: ASTT-012 to ASTT-020

Wi-Fi/API communication, readings, commands, encoder, magnetometer, GPS, and
basic sensor integration are complete. The next task is **ASTT-020**: build the
complete Veroboard circuit, connect both motor channels, and record dimensions,
connectors, and mounting holes for the PCB and enclosure.

### Motion and mechanics: ASTT-021 to ASTT-024 and ASTT-032 to ASTT-039

The AZ bracket and mechanical assembly exist. Complete motor wiring, verify AZ
closed-loop movement, finish the EL assembly, then package the electronics so
movement cannot strain or entangle the remaining power cable.

### Integrated PCB: ASTT-025 to ASTT-031

Treat the working Veroboard circuit as the PCB reference. Confirm rotating versus
stationary components, power requirements, E-stop routing, sensors, drivers, and
connectors before manufacturing. Bench-test the populated PCB before installation.

### Calibration and qualification: ASTT-040 to ASTT-051

True north and GPS location are established. Remaining work must calibrate both
axes, motor direction, useful PWM, deadband, stopping, motion limits, and E-stop.
Physical measurements are required before these tickets can be marked complete.

### Full-system integration: ASTT-052 to ASTT-068

The GUI/backend/hardware command path and source-based AZ calculation exist.
Complete physical AZ and EL Point/Track movement, return actual telemetry, then
run repeatable target-versus-actual tests for error, backlash, and repeatability.

## Firmware setup

Install Arduino CLI or PlatformIO and the libraries used by the selected sketch.
Keep local Wi-Fi credentials and API host configuration out of Git.

Typical Arduino CLI commands:

```bash
arduino-cli board list
arduino-cli lib list
arduino-cli compile --fqbn <board-fqbn> hardware/wemos_lilon32
arduino-cli upload -p <serial-port> --fqbn <board-fqbn> hardware/wemos_lilon32
arduino-cli monitor -p <serial-port> -c 115200
```

Before uploading, confirm the board, pins, motor power state, E-stop operation,
telescope ID, backend host, and mechanical limits with the user.
