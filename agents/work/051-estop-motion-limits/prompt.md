# ASTT-051: Qualify E-stop and motion limits

**Status:** Ready for physical qualification
**Area:** Hardware and calibration

## Context

The GPIO23 E-stop status input uses `INPUT_PULLUP` and a switch to ground, but
the firmware currently toggles its state on each press. A second edge can clear
the software stop, and the last command may resume after release.

## Goal

Make the firmware stop both axes whenever the E-stop input is active and require
a fresh command after it is released.

## In scope

- Treat GPIO23 LOW as E-stop active.
- Stop both motor channels while the input is active.
- Cancel Point/Track targets when the stop activates.
- Do not resume from an old command after release.
- Keep the AZ blocked zone and EL 0-90 degree limits unchanged.
- Document that the physical E-stop must cut motor power independently.

## Out of scope

- Replacing the physical normally closed power-cutting E-stop.
- Adding new physical limit-switch pins.
- Powering, flashing, or moving the antenna.

## Acceptance criteria

- [x] E-stop behavior no longer toggles in firmware.
- [x] Both motors are commanded off whenever GPIO23 is LOW.
- [x] Active Point/Track targets are cleared on E-stop activation.
- [x] Releasing the E-stop waits for a fresh command.
- [x] Existing AZ and EL software limits remain active.
- [x] Static checks pass where local tooling allows.
- [x] No hardware is flashed or powered.

## Likely files

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/README.md`
- `hardware/estop-limit-test.md`
- `agents/work/051-estop-motion-limits/completion.md`

## Verification

Run static checks first. Physical qualification must verify power removal, input
polarity, blocked-zone behavior, and both elevation limits before motor use.
