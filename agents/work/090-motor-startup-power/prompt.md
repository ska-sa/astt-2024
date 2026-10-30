# ASTT-090: Detect low-power motor hum and add bounded startup assistance

**Status:** Logged — not implemented; confirm measurements and protection first
**Area:** Hardware

## Context

The user reports that a motor can hum without moving at low PWM. A target can
remain unreached even while power is applied. ASTT-045 covers basic motor/PWM
calibration; this follow-up would add a limited response to insufficient startup
power without treating a hard stop, jam, or failed sensor as a request for more power.

## Goal

Detect a valid movement request with no measured progress, then apply an approved,
bounded startup PWM increase or stop with a clear stall indication.

## In scope

- Check target error, commanded PWM, fresh feedback, and measured movement over
  an agreed time window before declaring no progress.
- Increase startup/minimum PWM gradually only when assistance is permitted;
  respect the calibrated maximum and a limited retry/time budget.
- Keep limits, E-stop, command timeout, and feedback faults authoritative.
  Stop on suspected obstruction, exhausted assistance, or invalid feedback.
- Reset assistance when movement starts, a command changes, or motion stops;
  log the reason and applied PWM for bench checks.

## Out of scope

- Implementing or changing current PWM values now, bypassing limits, indefinite
  retries, or assuming that no movement proves insufficient power.
- Adding current sensing or changing wiring without confirming available hardware.

## Decisions and questions

- Confirm the affected axis and bench-calibrate safe startup/running/max PWM,
  step size, movement threshold, observation window, and stall timeout.
- Confirm how a limit/jam is detected and whether current or driver-fault
  feedback exists. Encoder silence alone cannot distinguish these from low power.
- Agree when assistance is safe; unresolved obstruction must stop rather than
  receive repeated boosts. Confirm recovery and operator reset behavior.
- EL use depends on valid, calibrated feedback and physical verification under
  ASTT-044/050/055. No thresholds or extra sensors are assumed.

## Acceptance criteria

- [ ] Low-power startup, normal movement, and on-target cases have distinct outcomes.
- [ ] Approved assistance starts movement within its bounds or stops within the
  agreed stall timeout; it cannot exceed the calibrated maximum.
- [ ] Hard stops, jams, E-stop, expired commands, and missing/stale feedback do not
  cause unrestricted power increases or automatic repeated retries.
- [ ] Computer checks pass; operator bench results and ASTT-045 calibration are recorded.

## Likely files

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/tests/`, `hardware/motor-calibration.md`, and `hardware/README.md`

## Verification

Use simulated feedback first to check bounded increases, reset paths, faults,
and timeouts. Plan an operator-approved bench test after confirming electrical
and mechanical protection; do not deliberately jam a powered motor.
