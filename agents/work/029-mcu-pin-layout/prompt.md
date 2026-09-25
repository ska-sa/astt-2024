# ASTT-029: Consolidate the MCU motor pins

**Status:** Needs physical wiring verification
**Area:** Hardware and firmware

## Context

The L298 control signals previously crossed both LOLIN32 header sides. The I2C
bus is already wired on GPIO21/SDA and GPIO22/SCL and remains unchanged.

## Goal

Place IN1, IN2, IN3, and IN4 on four consecutive header positions, with ENA
and ENB together elsewhere on the same side.

## Pin map

| Firmware signal | GPIO | L298 label |
| --- | ---: | --- |
| `AZ_IN1` | 14 | IN1 |
| `AZ_IN2` | 27 | IN2 |
| `EL_IN1` | 26 | IN3 |
| `EL_IN2` | 25 | IN4 |
| `AZ_ENA` | 33 | ENA |
| `EL_ENA` | 32 | ENB |

The header reads `13, 12, 14, 27, 26, 25, 35, 34, 33, 32`. GPIO14/27/26/25
are four consecutive direction positions. GPIO33/32 are adjacent enable
positions. GPIO12 is skipped because it is a boot-strapping pin, while GPIO35
and GPIO34 are skipped because they are input-only. Add 10 kOhm pull-down
resistors to ENA and ENB so both channels remain disabled during startup.

## In scope

- Keep all four L298 direction signals consecutive on one header side.
- Keep ENA and ENB adjacent on that same side.
- Keep GPIO21/SDA and GPIO22/SCL unchanged.
- Update integrated firmware and tracked documentation.
- Check that active pins remain unique.

## Out of scope

- Editing the user-maintained Vero drawings.
- Moving I2C, encoders, or E-stop signals.
- Applying motor power or flashing hardware.

## Acceptance criteria

- [x] IN1, IN2, IN3, and IN4 use consecutive physical header positions.
- [x] ENA and ENB use adjacent output-capable GPIOs.
- [x] All L298 signals are on one LOLIN32 header side.
- [x] GPIO21 and GPIO22 remain the I2C bus.
- [x] No boot-strapping or input-only pin drives the L298.
- [x] Firmware and tracked documentation agree.
- [x] Static pin-position and collision checks pass.
- [x] No hardware is powered or flashed.

## Likely files

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/README.md`
- `agents/work/029-mcu-pin-layout/completion.md`

## Verification

Update the disconnected wiring, verify both enable pull-downs, then run a
logic-only boot test before connecting either motor.
