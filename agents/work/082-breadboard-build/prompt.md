# ASTT-082: Build the controller on a small breadboard

**Status:** Draft
**Area:** Hardware

## Context

The Veroboard attempt under ASTT-020 did not work. To avoid spending more time
on that layout, the controller will be assembled on a small breadboard using
short, clear connections and the latest integrated firmware pin map.

## Goal

Build and safely verify the controller on a small breadboard before connecting
the motors. Design an enclosure only after the circuit works.

## In scope

- Match all motor, encoder, E-stop, and I2C connections to the integrated firmware.
- Confirm encoder supply voltage and ESP32-safe signal levels.
- Use shared power and ground rails where safe, with separate labelled signal wires.
- Keep 12 V motor power and motor outputs on the L298 terminals, not the breadboard.
- Perform continuity checks and a logic-only power-up.

## Out of scope

- Energising either motor before logic-only checks pass.
- Bypassing the physical E-stop.
- Designing or printing the final enclosure.

## Decisions and questions

- Keep the failed Veroboard files only as an archived reference.
- Resolve the encoder GPIO and level-conversion choice before connecting it.

## Acceptance criteria

- [ ] Breadboard wiring and firmware pin maps agree.
- [ ] Encoder power and signal voltage are safe for the ESP32.
- [ ] Power rails and signal wiring pass continuity/isolation testing.
- [ ] Logic-only power-up succeeds with motors disconnected.
- [ ] Readings and command polling work on the breadboard build.
- [ ] The working layout is recorded for the later enclosure task.

## Likely files

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/README.md`

## Verification

- Compare each breadboard connection with the firmware pin constants.
- Test the power rails and signal wiring with all power disconnected.
- Perform a current-limited logic-only power-up with motors disconnected.
