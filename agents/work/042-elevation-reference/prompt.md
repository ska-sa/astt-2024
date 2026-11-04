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

## Provisional design-angle offset — 2026-11-03

Operator reports upper stop raw 65.93° and design travel −16° to +93°; requests
an offset now, with no software EL limits while the lower stop is measured.
Assume positive 1:1 encoder scale for this trial: offset +27.07°, predicted raw
lower 316.93°, raw design zero 332.93°. Only the offset changes; retain sensor
readers, MPU levelling, power and movement logic. No rescaling can be established
from one endpoint. Validate the lower stop before adding travel limits.

This design range has midpoint 38.5° (predicted raw 11.43°). It cannot also have
midpoint zero using only an offset. This trial prioritizes the explicit upper=93°
request; midpoint-zero would give ±54.5° and remains deferred pending measurements.

## Operator-selected zero — 2026-11-03 (superseded)

Operator now chooses UI 46.7° under the previous +27.07° offset as zero. Raw
reference = 19.63°; set `EL_ENCODER_OFFSET=-19.63`. This supersedes the earlier
upper=93° assumption and midpoint-zero proposal for this trial. UI bounds and
EL gauge become −15° to +92°; AZ/EL gauges use triangular pointers. Preserve
encoder sampling, MPU levelling, PWM, motion logic and firmware input domain.

Earlier upper raw 65.93° would now display 46.3°; the requested +92° UI bound
is not a verified stop. Do not invent a scale factor or new firmware travel
bounds. Physical zero accuracy, scale and endpoints require the operator's tests.

## Operator-confirmed adjustment — 2026-11-04 (current)

The operator added +90° to −19.63°, giving `EL_ENCODER_OFFSET=+70.37°`, and
confirms both axes work. Preserve this correction. Raw 19.63° now displays 90°;
zero maps to raw 289.63°. UI −15°/+92° map to raw 274.63°/21.63°, not measured
endpoints. Re-record both actual stops and verify physical reference/scale before
adding software bounds. Automatic sensor referencing remains deferred.
