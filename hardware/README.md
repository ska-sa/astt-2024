# ASTT Hardware

The hardware subsystem contains firmware experiments and the integrated telescope
controller. The current integrated target is:

```text
hardware/wemos_lilon32/wemos_lilon32.ino
```

### Single-file Arduino IDE test

Open or copy the entire `.ino` above; no project header or extra sketch tab is
needed. Select **LOLIN32** from the ESP32 board package. The existing
ArduinoJson, Adafruit GPS and SparkFun
MMC5983MA libraries are still required; ESP32 provides WiFi/HTTP and FreeRTOS.

Use **Verify** first. A LOLIN32-target compile passes, but powered movement is
not yet qualified. Full calibration and mapping checks remain pending. For
initial sensor checks, keep motor power disconnected and use Serial Monitor
at `115200`. No board
has been flashed by the agent.

### Manual initial AZ alignment (current demo)

`USE_MANUAL_AZ_REFERENCE = true` selects a fixed mechanical reference. The
operator confirms clockwise 1:1 encoder mapping and both raw stops: `137.8°`
through `360°/0°` to `37.8°`. This permitted arc is 260° long, so its midpoint is
`norm360(137.8 + 260/2) = 267.8°`, **not** the ordinary average `87.8°`.
`encoderAtNorth = 267.8` records the selected north position; it is not a
measurement of the current heading at startup.

With motor power disconnected, manually place AZ at that raw midpoint, level
the base and rotate the whole base until the pointing direction faces true
north. Configure the phone/app for true north, not magnetic north, and cross-check
with an independent terrestrial reference. Per the operator's latest decision,
the firmware assumes this preparation: no new confirmation button, Serial
alignment gate, automatic centring or zeroing. Send a fresh Point/Track command
after preparation. Stop and realign after repositioning the base; the controller
cannot detect that change. Encoder agreement alone does not prove accuracy.

The manual offset stays fixed at `norm360(-267.8) = 92.2°`, even while idle or
when magnetic data/declination is missing. AZ telemetry is encoder-derived and
reference metadata/logs/UI say `MANUAL_ALIGNMENT`. Compass readings remain
visible as separate diagnostics in CAM and **Show more**. Serial prints the
same diagnostic snapshot; there are no Serial interaction commands.
Missing compass/date does not block manual Point;
celestial Track still needs actual UTC time. Automatic magnetic referencing and
installed heading calibration remain deferred under ASTT-047.

Older sketches remain as reference implementations. Do not assume their pins,
telescope IDs, or API hosts match the current assembly.

## Current system

The integrated firmware connects over Wi-Fi, posts readings, polls Point and
Track commands, reads the AZ encoder, magnetometer, and GPS, and controls the AZ
motor with E-stop handling. A firmware-only EL control draft uses a second
MPU6050 for feedback and L298 channel B. It still needs wiring, calibration, and
bench testing before use.

AZ movement uses encoder feedback with the fixed manual north reference.
Compass mounting and absolute pointing accuracy remain unqualified; a working
motor loop does not prove true-north accuracy.
Raw encoder travel limits remain separate.
Elevation uses accelerometer-derived tilt because a gyro alone will drift.

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

The motor loop uses encoder feedback and a fixed manual north reference:

- The **encoder** is the fast feedback used to move and stop the azimuth motor.
  Its mechanical angle is also used for the configured cable/hard-stop blocked
  zone.
- The **magnetometer** supplies diagnostic raw/magnetic/true-heading estimates;
  it does not set or refresh the manual reference. Its standalone working
  initialization, one-second retry, 100 ms settling and continuous field reads
  share the existing I2C bus and single sensor instance.
- The base **MPU6050** continues supplying telemetry and the existing EL draft's
  base reference. It does not gate or tilt-compensate AZ heading.
- **Gyro rates** remain diagnostics, not integrated pointing angles.

Mount the magnetometer and `0x68` MPU rigidly on the azimuth platform with known
axis alignment and the MPU Z axis vertical. The `0x69` MPU moves with elevation.

The control calculation is:

```text
north offset = norm360(-encoderAtNorth)
displayed azimuth = norm360(raw encoder + north offset)
encoder target = requested azimuth - north offset
motor error = encoder-angle distance along the safe route to the encoder target
```

Angles wrap into `0°–360°`. With the selected `267.8°` north position, raw
`267.8°` reports true AZ `0°`; true AZ `30°` targets raw `297.8°`. The raw
mechanical limits and route selection are unchanged.

Diagnostic magnetic heading still uses `atan2(Y, X) + mounting correction`,
then local declination for its true-heading estimate. No installed calibration
or tilt compensation is implied. Setting `USE_MANUAL_AZ_REFERENCE = false`
retains the old compass-estimate path for qualification, not a claim that
automatic referencing has been physically validated.

The declination comes from the quadratic in
`hardware/research/magnetic-declination-model.py`, reproduced on 2026-10-19:

```text
t = decimal UTC year - 2026
declination = (0.000701537703504 * t - 0.233941835534) * t - 26.67043477086
```

It is fitted for latitude `-33.944440°`, longitude `18.479819°`, altitude `6 m`,
and compared against WMM for 2026–2027 only. Firmware uses the real UTC fraction
of the year for `2026 <= year < 2028`. Unsynchronised or unsupported dates return
`NAN` and invalidate the diagnostic compass true heading, not manual Point;
there is no January fallback. Refit before changing
location or extending the dates; the model does not use live GPS coordinates. No WMM
library or web service runs on the MCU. Declination corrects magnetic north,
not sensor alignment or installed magnetic bias.

The canonical expression uses `atan2(Y, X)` in degrees.
The user selected `MAG_MOUNTING_OFFSET_DEG = 0°` for dish-forward; independent
heading checks remain pending. The operator separately confirmed clockwise 1:1
encoder mapping; that does not establish compass mounting or installed accuracy.

The SEN-19921 chip dot marks **pin 1**, not north or the dish's forward direction.
The [MEMSIC datasheet, page 9](https://cdn.sparkfun.com/assets/a/b/7/7/2/19921-09102019_MMC5983MA_Datasheet_Rev_A-1635338.pdf#page=9)
shows the sensor axes and their polarity after SET. Compare it with
[SparkFun's PCB design](https://github.com/sparkfun/SparkFun_Qwiic_Magnetometer-MMC5983MA/tree/main/Hardware).
An installed top-view photo showing the chip text/dot, Qwiic connector, and a
dish-forward arrow is still needed to confirm the mounting convention.

Raw measurements are centered at `131072`; there is no installed hard/soft-iron
correction. See [the supervised heading check](magnetometer-test.md). Full
calibration is deferred under ASTT-047, with earlier experiments retained in
the work-item history rather than active setup instructions.

The operator confirms physical stops at raw `137.8°` and `37.8°`. Allowed travel runs from
`137.8°` through `360°/0°` to `37.8°`; the gap between `37.8°` and `137.8°` is
blocked. These remain raw encoder limits; the UI shifts only the displayed
allowed arc by the current north offset. Before this reference change, the user
reported successful encoder-only Point tests at `20°`, `30°`, and `200°` without
hitting a limit switch.
The earlier `150°`, `170°`, and `190°` tests passed within the smaller window.
These interior tests do not establish stopping accuracy. Disconnect channel-B
motor power during AZ-only qualification; EL safeguards remain a logged task.

On boot, the firmware records the existing latest command ID and waits for a
valid encoder feedback before allowing a new command. It publishes the fixed reference
through existing telescope GET/PUT endpoints on a best-effort basis; failed
metadata publication does not disable local AZ control. Commands
saved before reboot are not replayed under the new reference: submit a new
Point/Track command after startup. Invalid encoder feedback still blocks AZ;
missing magnetic data does not invalidate the recorded manual reference.

Existing telescope metadata publishes raw limits/offset, `MANUAL_ALIGNMENT`,
an accuracy warning, and declination support. Old calibration/test-mode flags
are removed when this metadata is successfully refreshed.
The firmware refreshes it on the existing five-second telemetry interval.
Publication does not re-arm a completed Point. HTTP runs in one ESP32 task with
copied request/reply queues; only the main loop reads sensors or changes motors
and targets. Scheduling HTTP no longer inserts motor stops every two/five seconds.
Delayed replies from before E-stop, feedback loss or timeout are discarded.
Queue/task startup failure disables outputs. Sensor reads still have bounded
pulse/I2C waits; this is not a hard-real-time E-stop qualification.
CAM reloads metadata when a new reading arrives and before commands; loading
metadata does not start movement. Point validation converts true AZ to raw
encoder coordinates once and rejects blocked targets, including true `0°` if
its raw target falls in the no-go zone. No target is silently changed. Old
readiness flags do not block app Point commands; frontend/backend validate
numeric raw limits and offset only.

Manual telemetry contains encoder-derived AZ, so live readings and the graph
must not add the offset again. Historical rows keep their recorded values and
may use the earlier compass reference. A bad compass/date sample marks magnetic
diagnostics stale and health DEGRADED, but cannot change the manual offset.
Encoder error/arrival and raw limits use the same fixed reference.
`AZ POINT COMPLETE` records the AZ stop latch only; it does not qualify EL.
`ON TARGET` additionally requires valid AZ and both MPU readings with both axes
within tolerance. A successful POST alone never means the target was reached.
Raw magnetic telemetry remains Tesla; CAM displays it in `µT`.
Independent alignment accuracy, magnetic calibration and repeatable stopping
checks remain pending under ASTT-043, ASTT-047, ASTT-051, and ASTT-085.

AZ minimum PWM is now `210` (previously `140`, multiplied by 1.5), with maximum
`255` and the same error ramp/tolerance. This is commanded duty, not measured
speed or torque. Test short interior moves first: the higher floor can increase
overshoot. Automatic stall detection/startup boosts remain deferred under ASTT-090.

### Remote diagnostic line

The firmware builds one bounded diagnostic snapshot (a `1024`-byte buffer),
prints it roughly once per second, and attaches it as `serial_log` to each
five-second reading POST. It includes status, requested PWM, measured/target
angles, sensor availability/values, site source, command events, and previous
HTTP results. `reqPWM` is a request, not a measured motor current or speed.
`last_event` records the previous command outcome, not current readiness.
Genuine encoder, compass or unsupported/unsynchronised-date failures name their cause.

Manual-mode health reports **FAULT** for E-stop, network-worker failure or invalid
AZ encoder; **DEGRADED** for missing compass/date, MPUs or GPS fix; otherwise **OK**.
The optional compass-estimate mode retains its blocking magnetic/date checks.
Neither OK nor DEGRADED proves calibrated heading accuracy. While E-stop is held,
motor outputs stay off and telemetry/logs continue; command polling pauses.

The latest standalone working compass sketch is retained under
`hardware/research/magnetometer-live-test/magnetometer-live-test.ino`; keeping
it outside the integrated sketch avoids duplicate Arduino `setup()`/`loop()`.
The older calibration experiment remains under `hardware/research/magnetometer-reference/`.

### What happens after a position is disturbed?

An active AZ Point uses its fixed reference and raw encoder feedback. On arrival
the AZ motor stops and completion latches. Repeated polling of the same command
ID is a heartbeat, not permission to restart; later base movement must not
restart that completed Point. A new command ID is required. Automatic recovery
is deferred under ASTT-091.

The manual reference never refreshes from compass readings or the current boot
position. A ten-second communication timeout clears
targets; faults and E-stop also require a new command. Commands saved before
boot are not replayed. These rules do not establish sensor alignment or detect
unmeasured coupling slip. Never force the assembly against powered motors.

Computer-only math checks (requires Python and `g++`, no board needed):

```bash
python3 hardware/tests/test_azimuth_control.py
```

The host checks also use the installed ArduinoJson headers, defaulting to
`~/Arduino/libraries/ArduinoJson/src`. Set `ARDUINO_JSON_INCLUDE` to that library's
`src` directory if it is installed elsewhere. HTTP/FreeRTOS queues are simulated;
these checks do not prove physical timing or heading accuracy.

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
basic sensor integration are complete. The Veroboard attempt under **ASTT-020**
did not work and is archived for reference. The next task is **ASTT-082**: build
and verify the same controller on a small breadboard using the latest firmware
pin map and safe encoder signal levels.

### Motion and mechanics: ASTT-021 to ASTT-024 and ASTT-032 to ASTT-039

The AZ bracket and mechanical assembly exist. Complete motor wiring, verify AZ
closed-loop movement, finish the EL assembly, then package the electronics so
movement cannot strain or entangle the remaining power cable.

### Breadboard and enclosure

Use short, labelled connections and shared power rails on the small breadboard.
Keep motor current off the breadboard and route it through the L298 terminals.
After ASTT-082 passes bench testing, ASTT-036 and ASTT-038 cover designing and
fitting a simple enclosure around the working circuit.

### Calibration and qualification: ASTT-040 to ASTT-051

True north and GPS location are established. Remaining work must calibrate both
axes, motor direction, useful PWM, deadband, stopping, motion limits, and E-stop.
Physical measurements are required before these tickets can be marked complete.
Follow `hardware/motor-calibration.md` after the E-stop checks pass.

ASTT-090 is logged for low-PWM motor hum/no progress and bounded startup
assistance with stall protection. It is not implemented; current PWM values
remain unchanged until safe thresholds and obstruction handling are confirmed.

### Newly requested elevation and levelling work

- **ASTT-055 is reopened:** finish and physically verify EL movement using the
  existing L298 channel-B pins and two-MPU reference. The draft alone is not
  completed physical elevation.
- **ASTT-042:** confirm MPU axes and relative elevation zero.
- **ASTT-044:** integrate/calibrate the planned EL encoder after confirming its
  model, signal, mounting, and wiring. GPIO35 is reserved, not active feedback.
- **ASTT-050:** qualify physical elevation after calibration and safety checks.
- **ASTT-089:** add the manual-level UI indicator using the base MPU if suitable;
  do not confuse it with the separate moving elevation sensor.

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
