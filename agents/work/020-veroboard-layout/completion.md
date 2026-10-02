# ASTT-020 progress notes

**Status:** Failed — archived after the physical attempt did not work

## Result

- Recorded the user's completed manual Veroboard design.
- Replaced the crowded drawing with four separated Draw.io pages.
- Added L298 channel B for elevation on GPIO32, GPIO33, and GPIO18.
- Added a fixed level MPU6050 at `0x68`.
- Added a moving elevation MPU6050 at `0x69` on the same I2C bus.
- Reserved GPIO35 and a female header for a future elevation encoder.
- Updated the connector, jumper, and copper-cut tables.
- Preserved `hardware/vero.drawio` as the user's reference diagram.
- The user later reported that the Veroboard attempt did not work.
- The layout is archived and will not be rebuilt.

## Checked

- Draw.io XML parses successfully and contains four pages.
- The editable drawing, connection table, jumper list, and cut list are present.
- The drawing separates wiring, placement, jumpers, and cuts to avoid overlap.
- No hardware was cut, soldered, powered, or flashed.

## ASTT-082 pivot

- Build the controller on a small breadboard using the latest firmware pin map.
- Confirm MAE3 encoder supply and ESP32-safe signal-level conversion.
- Keep motor current on the L298 terminals and off the breadboard rails.
- Confirm the elevation MPU mounting direction and AD0/address-pad option.
- Design the enclosure only after the breadboard circuit passes bench testing.
