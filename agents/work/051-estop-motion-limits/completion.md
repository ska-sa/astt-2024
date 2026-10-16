# ASTT-051 progress notes

**Status:** Ready for physical qualification

## Implemented

- Replaced toggle behavior with a direct active-low GPIO23 E-stop state.
- Stop both motor channels for the full time the status input remains LOW.
- Clear AZ/EL targets and cancel Track mode when the E-stop activates.
- Require a fresh Point or Track command after release.
- Kept the configured AZ blocked zone and EL 0-90 degree limits.
- Added a staged logic, power-cut, and motion-limit test procedure.

## Verification

- Confirmed the old toggle state and edge variables are absent.
- Confirmed target clearing occurs before returning from an active E-stop loop.
- Confirmed existing AZ and EL software-limit checks remain present.
- `git diff --check` passed.
- Arduino CLI and PlatformIO are unavailable, so firmware compilation was not run.
- No hardware was flashed, powered, or moved.

## Remaining physical checks

- Confirm the GPIO23 auxiliary contact is HIGH when released and LOW when active.
- Confirm the normally closed E-stop directly removes L298 motor power.
- Confirm releasing the E-stop cannot resume an old command.
- Verify the AZ blocked zone and both EL limits with one axis powered at a time.

## AZ routing correction (earlier attempt)

This attempt is superseded by [ASTT-085](../085-encoder-point-limits/prompt.md):
encoder-only reference, zero fixed offset, and temporary allowed travel from
`137.8°` through `360°/0°` to the assumed `37.8°` opposite stop. Interior Point
tests passed; the opposite physical stop still needs measurement.

- Previously reported stops `252.4°` and `352.4°` are now disputed. The latest
  `132.3794°` stop observation came from the UI, not raw `enc`. Remeasure both raw
  stops before changing the configured limits.
- Replaced the rounded `250°–350°` path scan with direct direction checks.
  The stops are valid endpoints; only the gap between them is blocked.
- Compute PWM error along the allowed route, including turns longer than 180°.
- Seed encoder smoothing from the first valid reading and use a circular
  difference across zero instead of averaging `359°` and `1°` to `180°`.
- Added raw target, direction, offset, and separate position/target block reasons
  to serial diagnostics.
- Compiled and ran the actual math/encoder functions with host C++: 24 boundary
  and invalid-input cases, 5,184 route pairs, and five smoothing cases passed.
- ESP32 compilation and physical motion testing remain pending. No hardware was
  flashed or moved by the agent.
- Simplified direction to compare distance along the safe arc without extra
  state, supporting either a normal or zero-crossing blocked gap. Host checks
  also passed seven boundary cases and 5,184 route pairs for a zero-crossing gap.
- Increased serial encoder, raw target, offset, and corrected angle precision to
  four decimals for the pending stop measurements.
