# ASTT-020: Design the Veroboard layout

**Status:** Complete — manual design recorded
**Area:** Hardware

## Context

The integrated controller needs a compact, repeatable Veroboard layout before
physical assembly. The board has continuous vertical copper strips. Modules will
plug into labelled female headers so they can be removed or rewired with short
jumpers.

The completed manual design records these ESP32 signals:

- GPIO 25: L298 IN1
- GPIO 26: L298 IN2
- GPIO 27: L298 ENA/PWM
- GPIO 32: L298 IN3
- GPIO 33: L298 IN4
- GPIO 18: L298 ENB/PWM
- GPIO 34: azimuth potentiometer input
- GPIO 19: azimuth encoder input
- GPIO 35: reserved elevation encoder input
- GPIO 23: E-stop input
- GPIO 21: I2C SDA
- GPIO 22: I2C SCL

The GPS, MMC5983MA magnetometer, and two MPU6050 modules share the I2C bus. The
fixed MPU at `0x68` checks the level reference. The moving elevation MPU at
`0x69` measures elevation. Both MPU headers use the same SDA, SCL, 3V3, and GND
nets.

## Goal

Create an editable Draw.io design showing a compact, to-scale Veroboard hole
grid, connector pin locations, copper-strip routing, jumpers, and every required
track cut.

## In scope

- Use the physical 2.54 mm hole pitch and keep the board within the confirmed
  maximum dimensions.
- Show both a component-side placement view and a copper-side cut view.
- Represent pin headers and connector pins clearly; detailed component artwork
  is not required.
- Add female headers for the ESP32, combined GPS/magnetometer breakout, both
  MPU6050 modules, both L298 control channels, potentiometer, encoders, and E-stop.
- Place the L298 module above the board and route its low-current control signals
  through headers or short jumpers.
- Label power, ground, SDA, SCL, each GPIO signal, jumpers, and track cuts.
- Keep high-current motor paths separate from sensor and I2C routing.
- Add a pin-to-pin connection table and a cut/jumper checklist in
  `hardware/vero-design.md`.
- Preserve the user's existing `hardware/vero.drawio` draft.

## Out of scope

- Manufacturing a PCB or physically cutting/soldering the Veroboard.
- Flashing firmware, energising the motor, or bypassing the E-stop.
- Changing the approved elevation GPIO assignments.
- Decorative, dimensionally accurate drawings of module bodies.

## Decisions and questions

Confirmed:

- Copper strips run vertically.
- Female headers are preferred for removable modules and low-current signals.
- GPS and magnetometer share one breakout area; MPU6050 remains separate.
- The GPS, magnetometer, and both MPU6050 modules connect to the same I2C SDA/SCL nets.
- Ordinary Dupont headers will not carry motor supply or motor output current;
  those paths require the L298 terminal blocks or suitably rated connectors.
- The maximum is 100 mm × 100 mm. The drawing uses a 38 × 38 hole grid at
  2.54 mm pitch, which must still be compared with the physical board.
- The controller is a WEMOS LOLIN32. The first layout assumes the classic
  V1.0.0 1×16 plus 1×20 footprint, not the LOLIN32 Lite.
- Both MPU headers use GND, 3V3, SDA, SCL in that order.
- The L298 receives 12 V and GND. Its 5 V output is routed to the MCU through a
  removable, normally open verification link; a separate buck supply remains
  the recommended option if the L298 regulator cannot support Wi-Fi peaks.
- L298 channel B uses GPIO32 for IN3, GPIO33 for IN4, and GPIO18 for ENB.
- GPIO35 is reserved for a future elevation encoder.
- The fixed MPU uses address `0x68`; the moving elevation MPU uses `0x69`.

## Acceptance criteria

- [x] `hardware/vero-design.drawio` is valid XML with four separated pages.
- [x] The manual drawing records the intended board dimensions and hole grid.
- [x] Component-side and copper-side views use consistent coordinates.
- [x] Every connector pin is labelled and appears in the connection table.
- [x] Every required copper cut is marked with a coordinate and appears in the
      cut checklist.
- [x] Every jumper is labelled with its start/end coordinates.
- [x] Power, ground, logic voltage, motor voltage, and common-ground routing are
      unambiguous.
- [x] A continuity checklist is provided for testing before modules are fitted.
- [x] No credentials or private network addresses are added.
- [x] Documentation and the root checklist record the completed manual design.
- [x] Physical wiring validation and assembly are deferred to ASTT-082.

## Likely files

- `hardware/vero-design.drawio`
- `hardware/vero-design.md`
- `agents/work/020-veroboard-layout/prompt.md`
- `agents/work/020-veroboard-layout/completion.md`
- `README.md`

## Verification

- Open and inspect all four Draw.io pages.
- Validate the Draw.io XML.
- Cross-check every GPIO label against
  `hardware/wemos_lilon32/wemos_lilon32.ino`.
- Compare the grid and header spacing with physical measurements.
- With power disconnected, test intended continuity and isolation at every cut.

## Resume note

The user completed the layout manually. ASTT-082 now owns comparison with the
latest firmware, encoder voltage checks, physical measurements, assembly, and
continuity testing.
