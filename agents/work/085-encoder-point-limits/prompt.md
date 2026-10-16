# ASTT-085: Test encoder-only Point movement with shared limits

**Status:** Wrapped-range Point tests passed — final calibration pending
**Area:** Hardware and software

## Context

The changing magnetometer reference made UI angles unsuitable for measuring raw
encoder stops. A reported physical stop is raw `137.8°` when moving toward lower
angles. Raw `209.7°` was the initial temporary ceiling. The user now authorizes
an assumed opposite stop at `37.8°`, pending physical measurement. The old
`252.4°–352.4°` blocked zone is discarded because those measurements were disputed.

## Goal

Test one reference at a time: use the encoder with fixed offset zero, constrain
Point targets to the observed test window, and show invalid targets immediately.

## In scope

- Disable magnetometer correction of the movement reference.
- Use the temporary raw arc `137.8° → 360°/0° → 37.8°` selected by the user.
- Preserve separate sensor readings for later calibration.
- Store calibration in a JSON metadata column using existing telescope endpoints.
- Have the new firmware publish its active calibration on boot.
- Show the same range on the UI and reject invalid Point targets without clamping.
- Validate configured limits in the backend before storing a Point command.

## Out of scope

- Claiming the opposite physical stop is measured.
- Changing motor pins or polarity, flashing, or moving hardware from the agent.
- Qualifying true-north tracking or elevation motion.

## Confirmed decisions

- Encoder offset is fixed at `0°` for this test.
- Interior AZ test targets are `150°`, `170°`, and `190°`.
- Keep elevation at its current measured angle while testing AZ only.
- The assumed opposite stop is `37.8°`; the range remains marked temporary.
- Next test targets are `250°`, `350°`, and `20°` to exercise the zero crossing.

## Acceptance criteria

- [x] Computer checks cover reference conversion, direction, limits, and smoothing.
- [x] Backend tests preserve old data and verify metadata and Point rejection.
- [x] Frontend tests verify errors without changing the entered angle.
- [x] No new endpoint or destructive database reset is required.
- [x] The updated firmware is uploaded by the user.
- [x] Firmware publishes its calibration for the shared UI test range.
- [x] The user reports that all three interior Point targets work.
- [x] The user reports wrapped-range targets `20°`, `30°`, and `200°` work without hitting a limit switch.
- [ ] Repeat the targets in both directions and verify stopping accuracy.
- [ ] The assumed `37.8°` opposite stop is physically verified.

## Verification

Use isolated databases and simulated sensor input first. After the firmware
upload, verify serial shows `offset 0.0000` and `ref ENC`, and that the UI range
is `137.8° to 37.8° through 0°`. Test AZ independently with EL held at its measured value.
