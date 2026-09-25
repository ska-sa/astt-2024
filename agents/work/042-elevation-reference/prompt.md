# ASTT-042: Determine the zero-degree elevation reference

**Status:** Needs bench calibration
**Area:** Hardware and calibration

## Context

The `0x68` MPU6050 is mounted horizontally on the azimuth platform and measures
its small remaining tilt. The `0x69` MPU6050 moves with the elevation assembly.
The current firmware treats the moving MPU angle as absolute and does not
remove base tilt.

## Goal

Calculate elevation relative to the azimuth platform so manual levelling error
does not become pointing error.

## In scope

- Calculate base roll and pitch whenever the `0x68` MPU is read.
- Calculate the moving MPU pitch independently.
- Use `moving pitch - base pitch` as measured elevation.
- Keep configurable elevation sign and zero-offset constants.
- Keep the existing 0–90 degree software range.
- Stop elevation movement if either MPU reading is unavailable.
- Show base pitch, moving pitch, and relative elevation in serial diagnostics.

## Out of scope

- Final physical axis orientation and zero calibration.
- Adding an elevation encoder.
- Flashing or moving the antenna.

## Acceptance criteria

- [x] Small base tilt is removed from measured elevation.
- [x] Both MPU readings are required before elevation movement.
- [x] Point and Track continue using the same elevation target.
- [x] Sign, zero offset, and 0–90 degree limits remain configurable.
- [x] Serial output distinguishes base, moving, and relative angles.
- [x] Static checks pass where local tooling allows.
- [x] No hardware is flashed or powered.

## Likely files

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/README.md`
- `agents/work/042-elevation-reference/completion.md`

## Verification

- Check relative-angle examples with positive and negative base tilt.
- Compile when Arduino CLI or PlatformIO is available.
- Bench-test both MPU axes before enabling the elevation motor.
