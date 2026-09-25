# GPS qualification test

**Ticket:** ASTT-048
**Status:** Waiting for outdoor measurements

## Setup

1. Disconnect both motors from the L298 outputs.
2. Place the GPS antenna outdoors with a clear sky view.
3. Keep the antenna away from the ESP32 antenna, L298, motors, and power wiring.
4. Connect the configured Wi-Fi network so the current five-second reading log
   is printed during backend posting.
5. Start the serial monitor at 115200 baud.

## Fix acquisition

Record the time from power-on until `fix 1` appears in the GPS serial line.

| Test | Start type | Time to fix | Notes |
| --- | --- | ---: | --- |
| 1 | Cold start | | |
| 2 | Warm start | | |
| 3 | Warm start | | |

## Stationary readings

Once a fix is available, leave the antenna untouched for ten minutes. Record a
sample every minute and compare it with a trusted reference coordinate.

| Minute | Latitude | Longitude | Altitude (m) | Fix | Notes |
| ---: | ---: | ---: | ---: | ---: | --- |
| 0 | | | | | |
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |

Record:

- Average latitude and longitude.
- Maximum horizontal distance from the reference point.
- Minimum and maximum altitude.
- Any loss of fix or sudden position jump.

## Installed-system check

Repeat the ten-minute test with the GPS in its final enclosure and with all
electronics powered, but keep motors disconnected. If results degrade, move
the antenna or reduce electrical interference before qualification.

Do not mark ASTT-048 complete until an acceptable position-error limit is
agreed and the measured result meets it.
