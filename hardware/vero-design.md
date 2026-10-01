# ASTT-020 Veroboard layout

**Status:** Manual design complete; wiring validation required before assembly

The manual design was completed on 1 October 2026. ASTT-082 tracks reconciling
the drawing with the latest firmware and physically building and testing the
board.

The drawing is split into four pages so wires, connectors, and cuts do not
overlap:

1. System wiring overview.
2. Component-side connector placement.
3. One clearly separated line for every insulated jumper.
4. Mirrored copper-side track cuts.

Open `hardware/vero-design.drawio` in Draw.io. The user's older wiring diagram
remains unchanged in `hardware/vero.drawio` for reference.

## Board assumption

- 38 × 38 holes at 2.54 mm pitch.
- Approximate outside size: 96.52 × 96.52 mm.
- Copper strips run vertically.
- Component coordinates run from `A1` at the top left to `AL38` at the bottom
  right.
- Mark `A1` on both sides before flipping the board.
- Measure the real board and LOLIN32 header spacing before cutting.

## Two MPU6050 modules

Both modules use the same four I2C nets: `GND`, `3V3`, `GPIO21/SDA`, and
`GPIO22/SCL`.

- **H9 level MPU:** fixed to the base and checks whether the dish/base is level.
  Keep AD0 low so its address is `0x68`.
- **H10 elevation MPU:** mounted on the part that moves with elevation. Tie its
  AD0/address pad to 3.3 V so its address is `0x69`.

The H9 and H10 header order is `GND, 3V3, SDA, SCL`. AD0 is configured on the
MPU module itself and is not part of this four-pin header.

## Connector placement

| ID | Position | Female-header order | Purpose |
| --- | --- | --- | --- |
| H1 | D4:S4 | GND, 5V, 13, 12, 14, 27, 26, 25, 35, 34, 33, 32, 39, 36, EN, 3V3 | LOLIN32 upper 1×16 socket |
| H2 | D13:W13 | 15, 2, GND, 0, 4, 16, 17, 3V3, 5, 18, 23, 19, GND, GND, 21/SDA, 22/SCL, 3V3, RX0, TX0, GND | LOLIN32 lower 1×20 socket |
| H3 | I1:K1 | ENA, IN2, IN1 | L298 channel A / azimuth |
| H4 | M1:O1 | SIG, 3V3, GND | Azimuth potentiometer |
| H5 | X1:Z1 | ENB, IN4, IN3 | L298 channel B / elevation |
| H6 | A22:C22 | GND, key/empty, 5V OUT | Checked L298 5 V output to MCU supply link |
| H7 | D30:G30 | GND, 3V3, SDA, SCL | Combined GPS and magnetometer breakout |
| H8 | I30:J30 | GND, GPIO23 | E-stop status/sense only |
| H9 | D37:G37 | GND, 3V3, SDA, SCL | Fixed level MPU6050 at `0x68` |
| H10 | I37:L37 | GND, 3V3, SDA, SCL | Moving elevation MPU6050 at `0x69` |
| H11 | N37:P37 | GND, 3V3, GPIO19 | Azimuth encoder |
| H12 | R37:T37 | GND, 3V3, GPIO35 | Reserved future elevation encoder |

## Firmware net check

| Function | LOLIN32 GPIO | Board coordinate |
| --- | ---: | --- |
| L298 IN1 | 25 | K4 |
| L298 IN2 | 26 | J4 |
| L298 ENA/PWM | 27 | I4 |
| L298 IN3 | 32 | O4 |
| L298 IN4 | 33 | N4 |
| L298 ENB/PWM | 18 | M13 |
| Azimuth potentiometer | 34 | M4 |
| Azimuth encoder | 19 | O13 |
| Future elevation encoder | 35 | L4 |
| E-stop status | 23 | N13 |
| I2C SDA | 21 | R13 |
| I2C SCL | 22 | S13 |

## Copper cuts

Make cuts only with all power and modules disconnected.

| Group | Coordinates | Count | Reason |
| --- | --- | ---: | --- |
| C1 | D9 through S9 | 16 | Isolate the two LOLIN32 socket rows |
| C2 | N2 and O2 | 2 | Isolate potentiometer power from GPIO33/GPIO32 |
| C3 | D25 through G25 | 4 | Isolate the shared I2C connector bay |
| C4 | I25 through J25 | 2 | Isolate the E-stop bay |
| C5 | N25 through P25 | 3 | Isolate the azimuth encoder bay |
| C6 | R25 through T25 | 3 | Isolate the future elevation encoder bay |
| C7 | I32 through L32 | 4 | Separate the elevation MPU from the E-stop tracks |

Total: **34 track cuts**.

## Insulated jumpers

| Jumper | From | To | Net |
| --- | --- | --- | --- |
| W1 | A2 | D2 | GND to upper LOLIN32 |
| W2 / JP1 | C3 | E3 | Removable 5 V verification link |
| W3 | B5 | S5 | LOLIN32 3V3 to sensor rail |
| W4 | B1 | N1 | Potentiometer 3V3 |
| W5 | A1 | O1 | Potentiometer GND |
| W6 | A20 | P20 | GND to lower LOLIN32 |
| W7 | M20 | X3 | GPIO18 to L298 ENB |
| W8 | N7 | Y3 | GPIO33 to L298 IN4 |
| W9 | O8 | Z3 | GPIO32 to L298 IN3 |
| W10 | A27 | D27 | GND to shared I2C bay |
| W11 | B28 | E28 | 3V3 to shared I2C bay |
| W12 | R20 | F27 | GPIO21/SDA to shared I2C bay |
| W13 | S21 | G28 | GPIO22/SCL to shared I2C bay |
| W14 | A29 | I29 | E-stop GND |
| W15 | N20 | J30 | GPIO23 E-stop sense |
| W16 | A31 | N31 | Azimuth encoder GND |
| W17 | B32 | O32 | Azimuth encoder 3V3 |
| W18 | O20 | P34 | GPIO19 azimuth encoder signal |
| W19 | D33 | I33 | GND bridge to elevation MPU bay |
| W20 | E34 | J34 | 3V3 bridge to elevation MPU bay |
| W21 | F35 | K35 | SDA bridge to elevation MPU bay |
| W22 | G36 | L36 | SCL bridge to elevation MPU bay |
| W23 | A28 | R28 | Future elevation encoder GND |
| W24 | B29 | S29 | Future elevation encoder 3V3 |
| W25 | L7 | T30 | GPIO35 reserved elevation encoder signal |

Use insulated solid-core wire. Keep SDA and SCL together and away from motor
supply and output wires.

## L298 and power

- Connect 12 V and GND directly to the L298 screw terminals.
- Connect OUT1/OUT2 directly to the azimuth motor.
- Connect OUT3/OUT4 directly to the elevation motor when it is ready.
- Remove both ENA and ENB jumpers when GPIO27 and GPIO18 provide PWM.
- Do not carry motor current through Dupont headers or Veroboard strips.
- H6 receives only common GND and the L298 module's checked 5 V output.
- Keep W2/JP1 open during first power-up and measure the 5 V rail first.
- A separate 12 V-to-5 V buck converter rated for at least 1 A is safer if the
  L298 regulator cannot handle ESP32 Wi-Fi current peaks.
- Do not connect USB and external 5 V together until back-feed protection has
  been confirmed.

## E-stop limitation

H8 only reports E-stop state to GPIO23. A normally closed physical E-stop must
remove motor power independently of firmware. An auxiliary contact may feed H8
for status.

## Pre-power checklist

- [ ] The physical board and LOLIN32 socket match the drawing dimensions.
- [ ] H9 is fixed to the level reference and uses address `0x68`.
- [ ] H10 moves with elevation and uses address `0x69`.
- [ ] H9 and H10 both read `GND, 3V3, SDA, SCL` in that order.
- [ ] All 34 copper cuts are isolated.
- [ ] Every W1–W25 jumper passes continuity testing.
- [ ] No adjacent GPIO or power nets are shorted.
- [ ] L298 and logic grounds are common.
- [ ] ENA and ENB module jumpers are removed before PWM control.
- [ ] JP1 is open for the first powered test.
- [ ] Motors are disconnected during the first logic-only test.
- [ ] The physical E-stop removes motor power without depending on the ESP32.
