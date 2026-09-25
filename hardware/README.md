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
motor with E-stop handling. EL motor movement and closed-loop EL feedback remain
unfinished.

Use encoder feedback for motion control and the magnetometer as an absolute
heading/calibration reference. Use accelerometer-derived tilt as the future EL
reference; a gyro alone will drift.

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
