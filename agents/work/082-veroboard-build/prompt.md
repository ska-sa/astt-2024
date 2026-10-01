# ASTT-082: Reconcile and build the Veroboard circuit

**Status:** Draft
**Area:** Hardware

## Context

The manual Veroboard design is complete under ASTT-020. Before assembly, its
pin and power labels must be checked against the latest integrated firmware and
the actual components.

## Goal

Reconcile the design, build the Veroboard circuit, and verify it safely before
motors are connected.

## In scope

- Match all motor, encoder, E-stop, and I2C pins to the integrated firmware.
- Confirm encoder supply voltage and ESP32-safe signal levels.
- Confirm physical board dimensions and module spacing.
- Cut tracks, fit headers and jumpers, and perform continuity checks.
- Fit the completed board into the bottom enclosure.

## Out of scope

- Energising either motor before logic-only checks pass.
- Bypassing the physical E-stop.

## Decisions and questions

- Keep the user's manual Draw.io design as the layout source.
- Resolve the encoder GPIO and level-conversion choice before soldering.

## Acceptance criteria

- [ ] Drawing and firmware pin maps agree.
- [ ] Encoder power and signal voltage are safe for the ESP32.
- [ ] Board and module dimensions fit physically.
- [ ] Every cut and jumper passes continuity/isolation testing.
- [ ] Logic-only power-up succeeds with motors disconnected.
- [ ] The board fits securely in the bottom enclosure.

## Likely files

- `hardware/vero-design.drawio`
- `hardware/vero-design.md`
- `hardware/wemos_lilon32/wemos_lilon32.ino`

## Verification

- Compare the drawing with the firmware pin constants.
- Test continuity and isolation with all power disconnected.
- Perform a current-limited logic-only power-up with motors disconnected.
