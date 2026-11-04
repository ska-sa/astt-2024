# ASTT-056 verification — 2026-11-04

**Status:** Basic two-axis continuous tracking accepted by the operator on 2026-11-04.

The running-image logs and isolated tests reproduce `UNIQUE constraint failed:
command.name`, followed by the reported IndexError. Repeating identical Track
parameters previously also returned an old command ID. The migration removes
uniqueness only from command history and preserves rows, IDs, timestamps and the
AUTOINCREMENT high-water mark. Source names remain unique. POST checks insertion
success and reads the new ID, with no payload/UI schema changes.

EL now follows Track through its existing encoder controller. Both axes pause
outside the reachable AZ arc or EL 0–90°, and resume when the running source
returns to range. Either encoder failing cancels Track; restored feedback/repeated
IDs cannot restart it. Existing E-stop and communication timeout remain. Point
power, tolerances, offsets, encoder sampling and networking are unchanged.
RA coefficients/day fraction use double precision so the fast pattern does not
lose second-scale changes late in the year. Ordinary source equations are retained.

Added persistent source ID 2, initially **Fast sky sweep (30 min, 2026)**. Original Sun ID 1
and all 644 command rows were unchanged. A database backup is at
`/tmp/astt-track-before.db`. The generator is
`hardware/research/fast-sky-source.py`: existing day-based fields. Revised later
on 2026-11-04 at the operator's request to stay above the horizon throughout the
cycle. RA slope now equals sidereal hours/day, with a 30° fixed hour angle; DEC
oscillates between −15° and +15° with a 1-minute period (shortened from 30, then 5 minutes at the operator's request). At the configured site,
calculated AZ stays −62.41°..−35.31° and EL 33.33°..56.98°. It repeats on the UTC
clock; selection does not reset phase. Regenerate for another year/longitude and
recheck the arc for another latitude. This is a synthetic pattern, not a Sun model.

Updated only source ID 2 through the source API (HTTP 200), preserving its ID and
creation timestamp. Original Sun was checked unchanged. Previous source values
are saved at `/tmp/astt-fast-sky-source-before-above-horizon.json`. No firmware,
backend, UI code or service changes were needed for this parameter revision;
no command was submitted. Existing Track commands keep their parameter snapshots.

The five-minute revision updates only source 2's `name` and `T_dec` to
**Fast sky sweep (5 min, 2026)** and `0.0005526213301801921` days/radian.
Full-cycle firmware-math checks pass for January, November and December;
the above-horizon/allowed arc is unchanged. Source PUT and readback succeeded,
and the original Sun record was verified unchanged. The prior source is backed
up at `/tmp/astt-fast-sky-source-before-5-min.json`. No firmware upload or service
restart is required for this revision. Physical following speed remains for
the operator to test; software trajectory checks do not prove motor performance.


The latest revision shortens the cycle to one minute. Source 2 is now
**Fast sky sweep (1 min, 2026)**, `T_dec=0.00011052426603603843` days/radian;
only its name and period changed. Original Sun is verified unchanged after the
HTTP 200 update/readback. The previous values are saved at
`/tmp/astt-fast-sky-source-before-1-min.json`. Actual firmware checks pass over
complete one-minute cycles in January, November and December, retaining the
same above-horizon EL and permitted AZ range. No firmware or motor tuning change,
service restart, flash or motion command was performed. Refresh CAM and submit
a fresh Track command to use the shorter period; actual following speed still
requires operator testing.

## Verification

- Six isolated Track/storage/migration tests pass, including changed coefficients,
  multiple telescopes, rejected inserts, legacy Point schema and ID preservation.
- Twenty existing backend Point/metadata checks pass. Both backend suites also
  pass inside the prepared Python 3.13 container image.
- Actual firmware host checks pass: 129,600 safe AZ routes, existing Point/hold,
  generated source parsing/math/1-minute repetition, every-second above-horizon
  and reachable-arc checks for January/November/December, late-year smoothness,
  both-axis Track, range pauses/re-entry, feedback fault, repeated IDs,
  E-stop and timeout. No motors are connected to these tests.
- LOLIN32 compile passes: 1,038,811 bytes flash, 54,036 bytes static RAM.
- With operator approval, started only ASTT backend/frontend using the tested
  backend image. Both return HTTP 200. Read-only verification confirms source 2
  is visible, original Sun is unchanged, and all 644 command rows/IDs survive
  the live migration. Other services were not changed.
- No board flashed or live Point/Track command sent. No commit/push. ASTT-056 is now operator-confirmed for basic continuous tracking.

## Operator test

Use the previous two-axis Track sketch, refresh CAM, select the revised fast
source and submit a fresh Track command. The revised pattern has no below-horizon
half-cycle pause. A synchronized clock is required. With the recorded references,
check both axes follow and Stop/physical E-stop cancels movement; a new command
is required after E-stop or a communication/encoder fault. Original Sun remains
available for real-time tracking. Absolute alignment, EL stop/scale measurements
and tracking-error qualification remain separate work.

## Operator acceptance and checkpoint — 2026-11-04

The operator confirms that the one-minute pattern works, has calculated the
error and considers the result reliable. No numerical error measurements were
provided, so this does not claim an absolute accuracy or long-duration result.
ASTT-056 basic two-axis continuous tracking is complete; separate calibration,
safety and extended qualification tasks remain open. The operator requests this
working version be committed/pushed before the next encoder buffering and bounded
low-speed PWM-assistance experiment under ASTT-090.
