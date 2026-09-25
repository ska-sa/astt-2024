# ASTT-048: Qualify the GPS subsystem

**Status:** Ready for outdoor measurements
**Area:** Hardware and calibration

## Context

The firmware reads latitude, longitude, altitude, and fix state from the GPS
and posts the latest valid location. Physical measurements are still required
to confirm acquisition time, stability, and enclosure interference.

## Goal

Measure time to first fix and stationary location stability outdoors, then
repeat after installation in the enclosure.

## In scope

- Confirm GPS wiring and antenna orientation.
- Measure cold-start and warm-start time to first fix.
- Record latitude, longitude, and altitude for ten minutes while stationary.
- Compare the average location with a trusted reference coordinate.
- Repeat the test after final enclosure installation.
- Record dropouts or large position jumps.

## Out of scope

- Changing the backend reading schema.
- Motor movement during GPS testing.
- Marking qualification complete without outdoor measurements.

## Acceptance criteria

- [ ] GPS obtains an outdoor fix.
- [ ] Cold-start and warm-start acquisition times are recorded.
- [ ] Ten minutes of stationary readings are recorded.
- [ ] Horizontal error and altitude spread are calculated.
- [ ] Enclosure and electronics interference are checked.
- [ ] The user-approved accuracy limit is met.
- [x] No motor movement is required.

## Likely files

- `hardware/gps-test.md`
- `agents/work/048-qualify-gps/completion.md`

## Verification

Follow `hardware/gps-test.md` outdoors with an unobstructed sky view.
