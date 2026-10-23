# Magnetometer and true-heading bench test

**Ticket:** ASTT-047
**Status:** Manual AZ reference active; magnetic qualification deferred

## Current demo — 2026-10-23

`USE_MANUAL_AZ_REFERENCE = true`: magnetic data is diagnostic only. The operator
confirms clockwise 1:1 encoder mapping and both raw stops, `137.8°` and `37.8°`.
The permitted-arc midpoint is `267.8°`; its fixed north offset is `92.2°`.
Manually place AZ at that midpoint, level the base and align the pointing
direction with true north before a fresh command. No automatic centring or
Serial/UI confirmation interaction is added. Stop and realign after moving the
base; software cannot detect whether that preparation was performed.

Compass readings and their diagnostic heading remain visible in Serial/CAM/
Show more, but cannot overwrite encoder-derived AZ or block manual Point.
Missing/unsupported declination is diagnostic only; celestial Track still needs
real UTC. Missing compass/date reports DEGRADED in manual mode, not a calibration
error on the Point form. Invalid encoder, E-stop and network faults retain their
safety behavior. No independent absolute-accuracy claim follows from this offset.

The new working standalone sketch is retained under
`hardware/research/magnetometer-live-test/magnetometer-live-test.ino`, outside
the main Arduino sketch folder. Its initialization, bounded retry and continuous
reads are integrated without duplicate sensors, `setup()`/`loop()` or I2C setup.
Use terrestrial references for initial checks, not solar optical viewing.

The following basic-compass procedure is historical/future ASTT-047 material,
not the current manual-reference control contract. Review it before any later
automatic-reference qualification; it does not authorize motor action now.

## Historical basic compass test (not active manual control)

The firmware uses factory-centered magnetic readings, a user-selected `0°`
mounting correction, and the existing declination fit. There are no calibration
modes, calibration storage handling, verification gates, or calibration serial commands.
AZ heading does not require an MPU; keep the compass physically level because
tilt compensation is not applied. Raw limits, encoder freshness, E-stop, timeout
and command replay/completion protections remain; no reference stability timer.

Start with motor power disconnected and compare the heading independently.
A separately supervised Point must use an interior target in the current UI arc;
keep EL disconnected and the physical E-stop accessible. The opposite raw stop
is still assumed. Full calibration and accuracy work remain ASTT-047 follow-ups.

## Setup

The integrated firmware is in
`hardware/wemos_lilon32/wemos_lilon32.ino`. Open that one file in Arduino IDE;
no custom header or second tab is needed. Verify it for LOLIN32 before testing.

1. Hold E-stop and physically disconnect motor power before manual sensor work.
2. Confirm the SEN-19921 mounting with a top-view photo showing the chip text/dot,
   Qwiic connector, and a dish-forward arrow. The dot identifies pin 1, not north.
3. Verify encoder gearing/direction separately: compass-to-dish 1:1 movement
   does not establish encoder-to-dish 1:1 movement. A separately supervised short
   jog must show that motor direction `+1` increases raw encoder angle; record the
   physical rotation direction too.
4. Keep steel tools, magnets, speakers, and high-current wiring away. Level the
   actual compass mounting and the base MPU; do not assume their axes align.
5. Open the serial monitor at 115200 baud or use **Show more** on an API reading.

## Calibration deferred

The current sketch does not perform or load hard/soft-iron calibration. Earlier
experiments remain in work-item history; their commands are not active setup
instructions. Rebooting only establishes a fresh stationary estimate. Do not
tumble the travel-limited dish or expect a motor sweep to run on startup.

## Reference and mounting checks

`atan2(factory-centered Y, factory-centered X)` defines magnetic heading.
The user selected `MAG_MOUNTING_OFFSET_DEG = 0°`; independent heading checks
are still pending. Measure physical axes, dish-forward correction, encoder ratio,
and direction before trusting absolute pointing. The chip dot alone is insufficient.

Declination uses the fixed-site fitted polynomial with a real, synchronised
decimal UTC year in `[2026, 2028)`. Unsupported dates return `NAN` and block north;
there is no date fallback. Agreement with WMM does not verify mounting or local bias.

With both motors stopped and no active AZ Point/Track, valid encoder/compass
samples calculate the offset immediately. Metadata publication
is best effort, not a motion gate. Missing/invalid local feedback keeps the
reference unavailable. The same bounded diagnostic line is printed locally and
stored on each reading; for example:

```text
health=... state=... cmd=... last_event=... enc=... az=... target=... rawTarget=... reqPWM=... ref=... http_prev(command/reading/metadata)=...
```

The north offset is held fixed during an active AZ Point or Track. It may refresh
between commands only. AZ arrival latches `AZ POINT COMPLETE`; repeated polls of
that command ID do not re-arm motion. This says nothing about EL completion.
Displayed/recorded AZ is the live compass estimate, not the encoder projection.
Invalid compass samples retain its last estimate with FAULT and `heading=STALE`;
raw encoder angles, target conversion and stopping remain internal feedback.

Use the actual sensor availability and HTTP results to distinguish a missing
reference from an API error. Health FAULT covers E-stop or invalid AZ encoder/
heading/date; DEGRADED covers missing MPUs/GPS fix; OK is not an accuracy claim.
E-stop keeps motor outputs off while readings/logs continue; commands are not polled.

## Measurements

Agree a heading-error tolerance and use an independent true-heading reference.
Choose at least six separated reachable headings across the allowed arc and
repeat them from both directions. True `0°` is not guaranteed reachable: subtract
the current offset first, and do not command it if that raw target is blocked.
Raw travel remains `137.8° → 360°/0° → 37.8°`; the second stop is still assumed.

| Run | Reference | Expected | Encoder | Corrected AZ | Magnetometer | Gyro Z | Roll | Pitch | Notes |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Reachable A | | | | | | | | |
| 1 | Reachable B | | | | | | | | |
| 1 | Reachable C | | | | | | | | |
| 1 | Reachable D | | | | | | | | |
| 1 | Reachable E | | | | | | | | |
| 1 | Reachable F | | | | | | | | |

Calculate each error using the shortest signed difference across 0/360 degrees:

```text
heading error = ((measured true azimuth - expected azimuth + 540) % 360) - 180
```

Record the maximum absolute error and the spread between repeated readings.

## Short supervised acceptance checklist

- [ ] Photograph/verify chip axes and mounting; measure encoder ratio and sign.
- [ ] Keep the actual compass level and verify date/reference diagnostics before
  a new command; restarting must not replay an old command.
- [ ] With operator approval for powered AZ checks, test interior reachable
  headings; blocked raw targets, including true north when blocked, stay stopped.
- [ ] Repeat separated headings in both directions and record accuracy/spread;
  check again after installed wiring/enclosure changes. Direction-dependent error
  suggests interference or calibration limitations, not just a constant offset.
- [ ] After AZ completion, safely change base direction with motor power isolated;
  restore power under supervision and confirm the same command ID cannot restart
  AZ. Only a new command may start the next Point; do not force powered motors.
- [ ] Verify E-stop and communication timeout stop motion. Release/reconnect only
  under supervision and submit a new command; an older command must not resume.
  HTTP now runs separately from feedback and does not intentionally stop PWM at
  every poll/POST. Check a short interior move across several 2 s/5 s cycles.
  Minimum AZ PWM is now 210/255; check stopping/overshoot at this increased power
  before longer travel. Sensor waits still require E-stop timing qualification.
- [ ] Keep EL disconnected for AZ-only checks; its existing draft remains unqualified.

Do not mark ASTT-047 complete until the acceptable heading-error limit is
agreed and the measured result meets it.

References: [MEMSIC package dot/axis diagram, page 9](https://cdn.sparkfun.com/assets/a/b/7/7/2/19921-09102019_MMC5983MA_Datasheet_Rev_A-1635338.pdf#page=9),
[SparkFun SEN-19921 PCB files](https://github.com/sparkfun/SparkFun_Qwiic_Magnetometer-MMC5983MA/tree/main/Hardware).
