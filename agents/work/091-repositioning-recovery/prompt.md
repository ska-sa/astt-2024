# ASTT-091: Recover pointing after external repositioning

**Status:** Logged — deferred; no recovery implementation in the current AZ task
**Area:** Hardware and integration
**Priority:** LATER HIGH

## Context

The user wants later recovery when an external disturbance changes the antenna's
position. Encoder movement, movement of the whole base, and coupling slip are
different cases; the measured reference must remain trustworthy before recovery.
The 2026-11-04 ASTT-045 trial permits AZ encoder-based holding of an active Point. Whole-base/reference recovery and EL automatic recovery remain deferred.

## Goal

Define and verify when automatic recovery may safely return to a requested
position after a detected disturbance.

## In scope

- Distinguish disturbances visible to the encoder from changes to the base or
  sensor alignment; require fresh position/reference feedback.
- Agree which command states may recover automatically and when operator
  confirmation or re-referencing is required.
- Preserve raw limits, E-stop, command timeout, bounded motor power, and a clear
  stopped/fault state when recovery cannot be trusted.
- Test detection, recovery, and repeated-disturbance handling separately from
  ordinary Point arrival and ASTT-090 startup assistance.

## Out of scope

- Whole-base/absolute-reference recovery as part of the AZ encoder-hold trial.
- Guessing disturbance thresholds, overriding limits, or forcing powered motors.

## Decisions and questions

- Confirm the disturbances and command states that should trigger recovery.
- Confirm how whole-base movement or coupling slip is detected and how the
  north reference is checked before automatic movement.
- Agree tolerances, timeouts, operator controls, and recovery cancellation.

## Acceptance criteria

- [ ] Approved disturbances are detected without reacting to ordinary sensor noise.
- [ ] Permitted recovery reaches the target within an approved tolerance or stops
  within bounded time; unsafe/unverified cases remain stopped.
- [ ] E-stop, limits, stale feedback, cancelled commands, and repeat disturbances
  have verified outcomes, with no unintended automatic restart.
- [ ] Computer tests and separately approved physical checks are documented.

## Likely files

- Integrated firmware, host tests, and AZ calibration/control notes

## Verification

Start with simulated disturbances and sensor faults. Plan operator-run physical
checks only after reference, movement, and E-stop qualification; do not force
the assembly against powered motors.

## Scope clarification — 2026-11-04

The operator authorized continued AZ corrections to the same target under
ASTT-045. This covers encoder-visible drift while the command is still active;
it cannot observe base movement or coupling slip. E-stop, timeout, feedback loss
and blocked travel still cancel AZ and need a fresh command. This ticket remains
open for the broader reference/detection work.
