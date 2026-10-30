# ASTT-089: Show whether the antenna platform is manually levelled

**Status:** Logged — confirm sensor axes and tolerance before implementation
**Area:** Hardware and software

## Context

The user wants an MPU-based manual-level indicator. The firmware reads an MPU at
`0x68` for diagnostics; its actual mounting must be verified before using it to
indicate base level. The old second-MPU EL draft is removed; elevation now uses
an encoder. ASTT-042 covers mechanical midpoint zero, not a visible level status.

## Goal

Show base roll/pitch and a clear Level / Needs levelling / Unknown indicator.

## In scope

- Reuse the existing base/AZ MPU when its mounting is confirmed; do not assume
  another sensor or change wiring just for this display.
- Use gravity-derived tilt while stationary and an approved angular tolerance.
- Display measured tilt and a simple state for manual adjustment.
- Show Unknown for missing/stale/invalid/moving data; default zero is not proof of level.
- Keep base levelling separate from moving-dish elevation and the EL encoder.
- Reuse existing telemetry where practical; document axes/zero calibration.

## Out of scope

- Automatic levelling, guessed thresholds, new pins, or an unapproved motion interlock.

## Decisions and questions

- Confirm base MPU axes, stationary check, level reference, tolerance, and
  whether the first indicator is advisory only.
- If the current MPU is unsuitable, confirm mounting or extra hardware before
  implementation rather than assuming another MPU.
- Coordinate with ASTT-042 mechanical zero, ASTT-043 manual AZ, and ASTT-055 elevation.

## Acceptance criteria

- [ ] Known tilt cases and a confirmed level reference produce the right state.
- [ ] Missing/stale/nonfinite/moving readings show Unknown, not Level.
- [ ] UI updates tilt/status without changing Point/Track control.
- [ ] Tests pass and agreed axes/tolerance are documented.
- [ ] Physical verification stays incomplete until measured on the assembly.

## Likely files

- Integrated firmware only if telemetry needs extending
- CAM/readings UI, reading interfaces, and tests
- `hardware/README.md` and ASTT-042 notes

## Verification

Test synthetic tilt data first. Then have the operator check positive/negative
tilts and a level reference with motor power disconnected.
