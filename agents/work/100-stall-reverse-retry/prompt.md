# ASTT-100: Bounded reverse-and-retry recovery

**Status:** TODO | HIGH — next control task; not implemented
**Area:** Hardware / Integration

## Context

On 2026-11-05 the operator accepts the 0.05° tolerance/direct-maximum assistance
version, pushed as `c1559c7`, and requests recovery when an axis still sticks.
The current firmware stops on sustained lack of progress and needs a new command.

## Goal

For either axis, perform a bounded intermediate movement: stop, reverse a short
distance, retry through the sticking position at maximum PWM, then resume the
original Point target or Track source. Maximum PWM does not guarantee speed.

## In scope

- Preserve the original command and use temporary internal encoder targets for
  recovery; repeated polling must not restart or multiply recovery attempts.
- Recover one axis at a time, with the other stopped during the attempt.
- Settle before reversing, back away a configured few degrees, then retry in
  the original direction. Stop the maximum-PWM phase at a bounded clearance
  point or before reaching the original target; retain normal final approach.
- Resume the original Point target; for Track, recompute the current source
  position instead of returning to an obsolete target. A newer command cancels
  the old recovery and takes priority.
- Bound attempts, time, travel and PWM. If clearance is unavailable, progress
  fails again, or feedback becomes invalid, stop and retain a clear fault.
- E-stop, communication loss, wrong-direction faults and physical/software
  limits remain authoritative; they must not trigger automatic motion/rearming.
- Use the existing movement status/serial diagnostics to identify the stuck
  position, recovery stage, attempt and outcome. Preserve encoder filtering.

## Decisions and measurements before implementation

- Measure/verify limits, reverse clearance and stopping margins on each axis
  (ASTT-044/051). EL firmware endpoints remain pending; a power-cut switch alone
  cannot identify a safe reverse-and-retry path or distinguish a jam.
- Confirm reverse distance, forward clearance, retry count, timeout and supported
  load. Do not invent these from the unqualified UI range or bypass a stop.
- Qualify this separately from automatic recovery after base repositioning
  (ASTT-091). No sensor-reference changes, API command type or UI redesign needed.

## Acceptance criteria

- [ ] An eligible stuck Point/Track performs the bounded sequence and resumes
  its preserved command, without duplicate retries from repeated command IDs.
- [ ] Both directions and 0/360 wrap respect the permitted encoder travel path.
- [ ] Near-limit, failed retry, stale encoder, E-stop, timeout and superseding
  command cases cancel recovery and stop or apply the new command appropriately.
- [ ] Host checks, Arduino compile and supervised loaded tests pass; record
  actual recovery distance, stopping behavior and results before acceptance.

## Likely files and verification

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/tests/test_azimuth_control.py`
- `hardware/README.md`

Run the firmware regression suite and LOLIN32 compilation, then supervised
Point/Track tests on each axis with verified clearance and E-stop available.
Logging this ticket does not enable recovery or qualify hardware behavior.
