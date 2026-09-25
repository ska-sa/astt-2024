# ASTT-029 progress notes

**Status:** Needs physical wiring verification

## Implemented

- Put IN1, IN2, IN3, and IN4 on consecutive GPIO14/27/26/25 header positions.
- Put ENA and ENB together on adjacent GPIO33/GPIO32 header positions.
- Kept every L298 signal on the same LOLIN32 header side.
- Skipped boot-strapping GPIO12 and input-only GPIO34/GPIO35.
- Kept I2C on GPIO21/SDA and GPIO22/SCL.
- Documented 10 kOhm pull-down resistors for both enable signals.

## Verification

- Direction-position and enable-position checks passed.
- Active-pin uniqueness check passed.
- I2C pin-preservation check passed.
- `git diff --check` passed.
- Arduino CLI and PlatformIO are unavailable, so firmware compilation was not run.
- No hardware was flashed, powered, or moved.

## Remaining physical checks

- Update the manual Vero diagram and disconnected wiring to the new map.
- Confirm GPIO labels directly on the physical LOLIN32.
- Fit or verify pull-downs on ENA and ENB.
- Run a logic-only boot test before connecting either motor.
