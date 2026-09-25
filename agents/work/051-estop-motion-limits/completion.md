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
