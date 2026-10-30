# ASTT-096: Replace the EL motor with a faster suitable motor

**Status:** TODO
**Area:** Hardware | Motion control
**Priority:** HIGH

## Context

The operator confirms EL Point works in both directions, but movement is too slow
even with minimum and maximum PWM set to 255. Basic control is accepted under
ASTT-055; this task changes the motor rather than increasing PWM beyond its maximum.

## Goal and scope

Select and fit a faster EL motor that can move the loaded dish reliably.

- Measure present loaded speed and agree the required improvement with the operator.
- Confirm supply voltage, running/stall current, driver capacity, torque, gearing,
  shaft and mounting compatibility before selecting the replacement.
- Preserve encoder feedback, physical limit-switch protection and E-stop behavior.
- Retest direction, loaded speed, stopping and return to requested targets after
  fitting; update motor sign/PWM or recorded calibration only from those results.

## Out of scope

No motor purchase/installation now, guessed part specifications, supply-voltage
increase, disabled protection, or automatic magnetometer/MPU referencing.

## Acceptance criteria

- [ ] Replacement fits and is electrically/mechanically suitable for the loaded dish.
- [ ] Loaded speed improves to the agreed target without inadequate torque.
- [ ] Both directions, encoder feedback, limits, E-stop and target stopping pass.
- [ ] Motor specifications, wiring/settings and measured results are documented.

## Decisions and verification

Motor model, desired loaded speed, torque/current limits and mounting dimensions
must be established before implementation. Measure before/after travel time over
the same reachable angular span and repeat target/stopping checks under supervision.
Coordinate calibration with ASTT-045/050/051; this is separate from ASTT-090's
future stall detection/startup assistance.

Likely files: hardware motor/mounting notes, wiring documentation and only the
firmware settings demonstrated necessary by testing.
