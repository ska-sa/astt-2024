# Magnetometer and true-heading bench test

**Ticket:** ASTT-047
**Status:** Waiting for measurements

## Setup

1. Disconnect both motors from the L298 outputs.
2. Mount the magnetometer and `0x68` MPU rigidly on the azimuth platform with
   the MPU Z axis vertical.
3. Manually level the platform as closely as practical.
4. Keep steel tools, magnets, speakers, and high-current wiring away.
5. Start the serial monitor at 115200 baud.

## Calibration

1. Restart the controller.
2. Slowly rotate the azimuth platform through at least one complete circle
   during the calibration period.
3. Continue until serial output reports:

   ```text
   mag calibrated; true-north reference available
   az reference ready offset ...
   ```

4. If calibration does not complete, check I2C wiring and make a slower,
   complete rotation so both magnetometer X and Y ranges change enough.

## Measurements

Align the antenna with a trusted external reference. Let it remain still before
recording each row. Repeat all four directions three times.

| Run | Reference | Expected | Encoder | Corrected AZ | Magnetometer | Gyro Z | Roll | Pitch | Notes |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | North | 0° | | | | | | | |
| 1 | East | 90° | | | | | | | |
| 1 | South | 180° | | | | | | | |
| 1 | West | 270° | | | | | | | |
| 2 | North | 0° | | | | | | | |
| 2 | East | 90° | | | | | | | |
| 2 | South | 180° | | | | | | | |
| 2 | West | 270° | | | | | | | |
| 3 | North | 0° | | | | | | | |
| 3 | East | 90° | | | | | | | |
| 3 | South | 180° | | | | | | | |
| 3 | West | 270° | | | | | | | |

Calculate each error using the shortest signed difference across 0/360 degrees:

```text
heading error = measured true azimuth - expected azimuth
```

Record the maximum absolute error and the spread between repeated readings.

## Installed-system check

Repeat the stationary N/E/S/W readings after the L298, motors, enclosure, and
wiring are installed, but keep motor outputs disconnected. A consistent offset
may be corrected with `headingOffset`; direction-dependent changes indicate
magnetic interference and require moving the sensor or magnetic source.

Do not mark ASTT-047 complete until the acceptable heading-error limit is
agreed and the measured result meets it.
