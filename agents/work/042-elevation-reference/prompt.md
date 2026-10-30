# ASTT-042: Recorded midpoint as EL mechanical zero

**Status:** TODO — encoder-first plan; supersedes the MPU-only zero proposal
**Area:** Hardware | Calibration
**Priority:** TODAY CRITICAL

## Context and goal

The EL encoder is now available. Use its measured permitted travel, established
under ASTT-044/051, to define a repeatable mechanical zero at the midpoint.
That midpoint is not necessarily horizontal or the position occupied at boot.

## In scope

- Calculate the midpoint along the allowed encoder path, including wraparound.
- Record the raw endpoints, permitted direction, scale and midpoint in config.
- Define negative/positive mechanical EL angles on either side of that zero.
- Separate mechanical zero from later manual levelling/horizon calibration.
- Apply the same conversion contract as ASTT-094; keep raw limits protective.

## Out of scope

Requiring MPU/magnetometer calibration, assuming a second MPU, retaining an
unmeasured 0–90 range, treating boot position as zero, or automatic motor sweeps.

## Decisions and questions

Endpoint readings, encoder model/scale/sign and safe margins must be measured.
A 90-degree total travel would become roughly -45 to +45; this is an example,
not a claim about the actual EL stops.

## Acceptance criteria

- [ ] Recorded midpoint calculation handles wrap and survives restart/config reload.
- [ ] Encoder/mechanical conversions and signed range checks agree.
- [ ] Supervised return to EL zero is repeatable without crossing protected limits.

## Likely files and verification

Integrated firmware, host tests, calibration notes and minimal related command/UI
handling. Check synthetic wrapped arcs first, then approved EL bench measurements.
