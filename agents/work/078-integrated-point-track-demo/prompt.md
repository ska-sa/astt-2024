# ASTT-078: Encoder-based two-axis movement demo

**Status:** TODO — after independent AZ/EL checks; no implementation in this update
**Area:** Integration | Demonstration
**Priority:** CRITICAL

## Context and goal

Show reliable mechanical Point movement with both encoders and recorded midpoint
zeros. Automatic north-finding, celestial Track and absolute accuracy are not
requirements for today's demonstration. Preserve earlier manual AZ results.

## In scope

- Confirm restored-master AZ, then independently qualify EL under 044/042/055.
- Test short positive/negative targets and stopping on each axis separately.
- With raw limits/margins enforced, command reachable (AZ, EL) targets together
  and return repeatably to mechanical (0, 0).
- Verify direction, feedback loss, limit switches, E-stop, timeout and no old-ID
  replay/resume after restart or E-stop release.
- Record target versus measured mechanical angles, final error and interruptions.
- Use ASTT-059 for integration evidence and ASTT-079 for rehearsal/fallback.

## Out of scope

Automatic sensor references, software-only accuracy claims, solar optical viewing,
changing source/time models or automatic motor sweeps. Track remains separate work.

## Decisions and questions

Confirm test targets, safe margins, supervision and stop procedure. Manual setup
can align north/level later, but must not overwrite the recorded mechanical zeros.
A successful command POST is not evidence that the assembly reached its target.

## Acceptance criteria

- [ ] Separate-axis tests pass before combined movement.
- [ ] Both axes move/stop correctly and return to mechanical (0, 0).
- [ ] Raw limits, switches, E-stop, communication and feedback failures are verified.
- [ ] Recorded demo accurately labels mechanical operation and remaining limitations.

## Likely files and verification

Agreed test log/video, hardware notes and ASTT-059/049/050/051 evidence. Supervised
powered checks only after operator approval; no flashing/motion by logging tickets.
