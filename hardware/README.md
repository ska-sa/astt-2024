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

### EL encoder reading and movement test — ASTT-044/055

The operator confirms the same PWM encoder as AZ, connected to GPIO35, and has
verified its reading in the UI. The ASTT-090 trial keeps `HIGH / (HIGH + LOW) * 360`
and each 25 ms pulse timeout, but collects AZ/EL in a background task. Each axis
uses a rolling seven-sample circular median and 0.5 smoothing. The motor loop reads
the latest snapshot without waiting; samples older than 250 ms are invalid, and
startup/recovery requires seven fresh samples. Stale EL feedback reports
`elEnc=nan EL_ENC=ERR` and `el_encoder_angle: null`; the UI shows Not available
or a graph gap. Valid values appear as **Elevation Angle** everywhere.

The operator confirms basic EL Point movement works in both directions with
`EL_MOTOR_SIGN=-1` (2026-10-30). Firmware uses this encoder for feedback and
drives the motor through L298 channel B. The operator confirms that physical limit
switches open motor power; the reported upper stop is raw 65.93°, and the lower
stop still needs measurement.
No software travel endpoints are invented. `EL_MAX=360` is an input coordinate
bound, not a claim that the dish can travel a full revolution.

The UI now accepts EL **−15° to +92°** and shows that arc on the gauge, with
signed angles in readings/history. Negative targets still wrap into the existing
API/firmware 0–360° coordinates. Show more keeps raw `elEnc` for measurements.

### Operator-confirmed EL reference — 2026-11-04

The operator added +90° to the previous −19.63° offset and confirms both axes
now move and hold correctly. `EL_ENCODER_OFFSET=-19.63+90` is net +70.37°.
Firmware applies this once; the UI only converts wrapped values to signed
angles. Raw encoder 19.63° now displays 90°, and a 0° target maps to raw 289.63°.
The reference is recorded in config, not captured at boot.

The requested UI endpoints −15° and +92° map to raw 274.63° and 21.63°, across
360/0, with the existing 1:1 conversion. These are conversions, not measured
stops. The historical upper raw 65.93° would now display +136.3°; remeasure both
endpoints and verify scale in the current assembly before adding software travel
limits. No new limit or scale assumption is introduced by the offset correction.

For the supervised test after your upload:

1. Keep AZ at its current displayed angle. Command EL only 2–3 degrees away from
   its current reading, with clearance and physical E-stop available.
2. Verify the encoder approaches the target and stops. If it moves away, stop;
   reverse `EL_MOTOR_SIGN` before retrying. Check a small move in each direction.
3. EL keeps PWM 128–255, the 30° linear ramp and 0.1° tolerance. The current
   trial adds nominal 80 ms corrections inside 1°, with 300 ms settling between
   corrections and before reversal. Crossing the target pauses before correcting
   back; reaching tolerance keeps the Point active for encoder-based hold.
   Encoder pulse waits now run in a background task. Filtering adds feedback lag;
   actual pulse/stop timing still follows the control loop, including I2C reads,
   and requires bench measurement.
4. Check small moves in both directions, settling drift, E-stop and timeout.
   Missing/stale feedback, ten seconds without command communication or E-stop
   cancel movement. Old command IDs cannot restart a cancelled Point. Record
   both physical stop readings; switches still cut motor power at the stops.

EL Track now uses the same encoder controller as Point. Both axes pause when
Track targets fall outside reachable AZ travel or EL 0–90°; they resume when
that source returns to range. Encoder loss, timeout or E-stop cancel Track and
require a fresh command. AZ limits, pins, encoder readers and networking are preserved.

### Fast Track test source — ASTT-056

Select **Fast sky sweep (1 min, 2026)** for a synthetic repeating arc that stays
above the horizon at the configured site. The revised parameters give approximately
AZ −62.41° to −35.31° and EL 33.33° to 56.98°, completing a cycle every minute.
RA follows sidereal time to keep hour angle at 30°; DEC oscillates between ±15°.
Selection does not reset the phase. Original **Sun** is unchanged for real-time
tracking. Refresh CAM and send a new Track command after updating source parameters;
existing commands retain their saved source values. This parameter adjustment
requires no firmware change beyond the previous two-axis Track sketch.

`python3 hardware/research/fast-sky-source.py --year 2026` prints the existing
API source fields. `--period-minutes` can generate a shorter cycle; regenerate
for another site/year. These are day-based coefficients, unlike the pasted
research script's minute-based annual compression. No clock, API fields or
calibration changes are needed. This pattern is not a solar accuracy reference.
See [Track checks](../agents/work/056-continuous-tracking/completion.md).
EL motor direction/basic movement are accepted. Gear scale, recorded physical
stops and quantified E-stop/stopping tests remain open. Qualify the faster replacement motor
under ASTT-096; software checks do not establish physical accuracy.

## Current system

The integrated firmware posts telemetry, polls Point/Track and uses encoder
feedback with a fixed AZ reference. EL Point now uses its GPIO35 encoder and a
fixed offset; the old second-MPU EL draft is removed. Magnetometer, MPU and GPS
readings remain diagnostic. Automatic sensor references and absolute accuracy
are deferred until reliable mechanical movement and mounting are established.

### Control pin map

| Signal | LOLIN32 pin | Note |
| --- | --- | --- |
| L298 IN1 | GPIO14 | Azimuth direction |
| L298 IN2 | GPIO27 | Azimuth direction |
| L298 IN3 | GPIO26 | Elevation direction |
| L298 IN4 | GPIO25 | Elevation direction |
| L298 ENA | GPIO33 | Azimuth PWM; add a 10 kOhm pull-down |
| L298 ENB | GPIO32 | Elevation PWM; add a 10 kOhm pull-down |
| EL PWM encoder | GPIO35 | EL feedback; operator-confirmed wiring |
| I2C SDA | GPIO21 | Shared sensor bus |
| I2C SCL | GPIO22 | Shared sensor bus |

The physical header sequence is:

```text
GPIO: 13    12    14   27   26   25    35    34    33   32
Use:  free  skip  IN1  IN2  IN3  IN4   ELenc skip  ENA  ENB
```

This keeps all four direction signals consecutive and places both enable signals
together elsewhere on the same header side. Motor outputs avoid boot-strapping
GPIO12 and input-only GPIO35/GPIO34. Keep both enable pull-downs fitted so the motors stay
disabled while the MCU starts.

The existing MPU6050 at `0x68` remains diagnostic; EL movement no longer
requires a second MPU at `0x69`.

The firmware names the L298 channel-A pins `AZ_IN1`, `AZ_IN2`, and `AZ_ENA`.
Channel-B pins are `EL_IN1`, `EL_IN2`, and `EL_ENA`; these map to the L298
module labels IN3, IN4, and ENB. The old potentiometer input has been removed.

### Elevation reference model

`EL_ENCODER_OFFSET` is hardcoded to `0.0°` for the initial movement tests:

```text
elevation angle = norm360(raw encoder + EL_ENCODER_OFFSET)
encoder target  = norm360(requested elevation - EL_ENCODER_OFFSET)
```

Readings, history, graph and Point commands use the same reference. Later this
reference can come from the measured midpoint or qualified sensors; it is never
reset to the startup position. Signed midpoint coordinates and measured software
travel limits are the next step under ASTT-042/094. Until then, use small targets
near the current reading. The shortest angular route is not a verified EL safe
path across a full revolution; physical switches protect the test travel.

### Azimuth reference model

The motor loop uses encoder feedback and a fixed manual north reference:

- The **encoder** is the fast feedback used to move and stop the azimuth motor.
  Its mechanical angle is also used for the configured cable/hard-stop blocked
  zone.
- The **magnetometer** supplies diagnostic raw/magnetic/true-heading estimates;
  it does not set or refresh the manual reference. Its standalone working
  initialization, one-second retry, 100 ms settling and continuous field reads
  share the existing I2C bus and single sensor instance.
- The **MPU6050** continues supplying diagnostic telemetry. It does not gate
  encoder movement or tilt-compensate AZ heading.
- **Gyro rates** remain diagnostics, not integrated pointing angles.

Mount the magnetometer and `0x68` MPU rigidly on the azimuth platform with known
axis alignment for future reference calibration.

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
`AZ POINT COMPLETE` records arrival inside the AZ tolerance; that Point remains active for encoder hold and does not qualify EL.
`ON TARGET` additionally requires valid AZ and EL encoder feedback, both Point
arrival flags and both angles within tolerance. A successful POST alone never means the target was reached.
Raw magnetic telemetry remains Tesla; CAM displays it in `µT`.
Independent alignment accuracy, magnetic calibration and repeatable stopping
checks remain pending under ASTT-043, ASTT-047, ASTT-051, and ASTT-085.

Current PWM ranges are AZ `150–255` and EL `128–255`. The operator retained
AZ minimum PWM at 150 on 2026-11-05 while increasing its assistance budget.
Their existing ramps remain 60° and 30°. Both axes retain the operator-confirmed
0.1° tolerance and short corrections within 1°, nominally 80 ms with 300 ms
settling before another correction or reversal. Actual timing follows the control
loop; I2C reads can still lengthen it. The operator accepts basic buffered-feedback operation on 2026-11-05; measured
repeatability/overshoot qualification remains pending.

The ASTT-090 trial checks progress once per second during continuous travel,
outside the 1° fine zone. Progress below 0.1°/s adds 15 PWM, up to 100 extra for
AZ or 60 for EL, never above the configured axis maximum. Useful assistance is retained while
moving; stopping, reversal, a new command or entering the fine zone resets it.
Ten seconds without sufficient AZ progress (five for EL), or clear movement
in the wrong direction, stops both axes with `MOTION FAULT`; only a new command can retry. No movement
alone cannot distinguish stiffness from a jam. These are configurable trial values,
not calibrated torque/current limits. Physical EL switches cut motor power;
measured firmware EL travel endpoints remain pending.

### Remote diagnostic line

The firmware builds one bounded diagnostic snapshot (a `1024`-byte buffer),
prints it roughly once per second, and attaches it as `serial_log` to each
five-second reading POST. It includes status, requested PWM, measured/target
angles, sensor availability/values, site source, command events, and previous
HTTP results. `azSpeed_dps` and `elSpeed_dps` are signed encoder speeds estimated
over at least 250 ms; `boost=AZ/EL` reports the current extra PWM. Speeds are
unavailable until a valid measurement interval exists. `azError` is the shortest
signed angular error, while the motor still follows the permitted raw travel path.
Assistance measures progress over its separate one-second window. `reqPWM` is a
request, not measured current. Log speed, error and requested PWM when tuning power.
`last_event` records the previous command outcome, not current readiness.
Genuine encoder, compass or unsupported/unsynchronised-date failures name their cause.

Manual-mode health reports **FAULT** for E-stop, a latched motion fault,
network-worker failure or invalid AZ encoder; **DEGRADED** for missing compass/date, MPU, EL encoder or GPS fix; otherwise **OK**.
The optional compass-estimate mode retains its blocking magnetic/date checks.
Neither OK nor DEGRADED proves calibrated heading accuracy. While E-stop is held,
motor outputs stay off and telemetry/logs continue; command polling pauses.

The latest standalone working compass sketch is retained under
`hardware/research/magnetometer-live-test/magnetometer-live-test.ino`; keeping
it outside the integrated sketch avoids duplicate Arduino `setup()`/`loop()`.
The older calibration experiment remains under `hardware/research/magnetometer-reference/`.

### What happens after a position is disturbed?

An active AZ Point uses its fixed reference and raw encoder feedback. After
arrival it holds that target: persistent error outside 0.1° resumes correction
after settling. Repeated polling is only a heartbeat; it does not reset the
correction timing. E-stop, blocked travel, lost feedback and communication timeout
cancel movement; recovery requires a new command. The separate EL trial now
holds its target in the same way, with its existing 0.1° tolerance and fresh
EL encoder feedback required. Whole-base movement and coupling slip invisible to the encoder cannot be
corrected by this hold; reference recovery remains deferred under ASTT-091.

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

ASTT-090 buffered encoder feedback and bounded power assistance are accepted by
the operator for basic operation on 2026-11-05. Host checks and LOLIN32 compile
pass; loaded motor/feedback qualification remains open. See `agents/work/090-motor-startup-power/completion.md`
for the supervised test checklist. The accepted pre-trial version is `95e0617`.

### Newly requested elevation and levelling work

- **ASTT-055 is complete for basic EL Point movement:** the operator confirms
  both directions work with `EL_MOTOR_SIGN=-1`.
- **ASTT-096:** replace the EL motor with a faster suitable motor, then retest
  direction, loaded movement, limits and stopping.
- **ASTT-042:** record both stops, then set mechanical zero at the permitted midpoint.
- **ASTT-044:** GPIO35 PWM readings now work in the UI per the operator. Record
  direction, scale and both limit-switch stop positions next.
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
