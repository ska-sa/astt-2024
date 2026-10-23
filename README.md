# ASTT

One repository for the ASTT telescope hardware, firmware, backend, frontend, and project work.

## Repository layout

```text
.
├── AGENTS.md
├── agents/          # Prompt template and work-item records
├── hardware/        # Firmware, electronics notes, and hardware tasks
└── software/        # Angular frontend, FastAPI backend, and design files
```

Read [AGENTS.md](AGENTS.md) before starting work. Software details are in
[software/README.md](software/README.md), and hardware details are in
[hardware/README.md](hardware/README.md).

## Progress

**40 of 80 work items complete.** The checklist is the project source of truth.
Only mark an item complete after its acceptance criteria have been verified.
ASTT-055 is reopened: the EL firmware draft exists, but physical elevation is
not complete.

### 1. Software and backend foundation — 14/16 complete

- [x] **ASTT-001** Create the database schema for telescopes, readings, commands, and sources. — Slindile
- [x] **ASTT-002** Implement FastAPI CRUD endpoints. — Slindile
- [x] **ASTT-003** Add the latest-command endpoint for hardware polling. — Slindile
- [x] **ASTT-004** Add the reading-range endpoint for monitoring. — Slindile
- [x] **ASTT-005** Support Point and Track command structures. — Sanele
- [x] **ASTT-006** Add Angular controls for Point and Track commands. — Sanele
- [x] **ASTT-007** Display live hardware readings on the CAM page. — Sanele
- [x] **ASTT-008** Add source management for tracking. — Sanele
- [x] **ASTT-009** Show Point and Track information on the commands page. — Sanele
- [x] **ASTT-010** Stabilize the monitoring graph and live-data filtering. — Sanele
- [ ] **ASTT-011** Add Keycloak authentication and authorization.
- [x] **ASTT-081** Improve command confirmation and keep navigation visible. — Sanele
- [x] **ASTT-083** Configure Docker LAN access through an environment file. — Sanele
- [x] **ASTT-084** Add a UI stop control that holds the current measured angles. — [Software verified](agents/work/084-ui-stop/completion.md); not a physical E-stop
- [x] **ASTT-092** Expose one-line reading diagnostics and measured sensor health in all reading views. — [Software verified](agents/work/092-reading-diagnostics/completion.md); revised firmware still needs operator upload
- [ ] **ASTT-085** Test encoder-only AZ control and reject targets outside shared telescope limits. — Sanele

### 2. Electronics and sensor integration — 10/10 complete

- [x] **ASTT-012** Connect the MCU to the backend over Wi-Fi and HTTP. — Sanele
- [x] **ASTT-013** POST telescope telemetry and readings. — Sanele
- [x] **ASTT-014** GET the latest Point and Track commands. — Sanele
- [x] **ASTT-015** Resolve ESP32 and ADC pin conflicts. — Sanele
- [x] **ASTT-016** Fix sensor-reading issues and verify basic accuracy. — Sanele
- [x] **ASTT-017** Integrate azimuth encoder feedback. — Sanele
- [x] **ASTT-018** Integrate magnetometer and true-north measurement. — Sanele
- [x] **ASTT-019** Integrate GPS location information. — Sanele
- [x] **ASTT-020** Complete the manual Veroboard design. — Failed; archived for reference
- [x] **ASTT-082** Build and verify the controller on a small breadboard. — Sanele

### 3. Motion control — 4/5 complete

- [x] **ASTT-021** Assemble the AZ mechanical parts and motor bracket.
- [x] **ASTT-022** Complete the AZ motor-driver and control wiring.
- [x] **ASTT-023** Update MCU firmware to drive AZ movement.
- [x] **ASTT-024** Verify closed-loop AZ movement and encoder feedback.
- [ ] **ASTT-093** Remove network-induced AZ pauses, raise minimum PWM, and show live measured AZ/device status. — [Software verified; supervised motion pending](agents/work/093-continuous-az-motion/completion.md)

### 5. Mechanical integration and enclosure — 2/8 complete

- [x] **ASTT-032** Design and print the laser bracket. — Sanele
- [x] **ASTT-033** Integrate the ASTT AZ mechanical assembly. — Sanele
- [ ] **ASTT-034** Repair or reprint the AZ motor and encoder gears. — High
- [ ] **ASTT-035** Complete the EL mechanical assembly. — Critical
- [ ] **ASTT-036** Design the top enclosure around the integrated electronics. — Uhone
- [ ] **ASTT-037** Include mounts for rotating sensors and connectors. — High
- [ ] **ASTT-038** Print the enclosure and assemble the electronics. — LATER HIGH; follow the agreed ASTT-036/037 design with teammates
- [ ] **ASTT-039** Verify movement does not strain or entangle power cables. — Critical

### 6. Calibration and subsystem qualification — 3/12 complete

- [x] **ASTT-040** Establish the true-north reference. — Sanele
- [x] **ASTT-041** Establish the telescope GPS location. — Sanele
- [ ] **ASTT-042** Determine the zero-degree elevation reference. — Critical
- [x] **ASTT-043** Establish the manual AZ encoder reference. — [Done for the manual demo](agents/work/043-azimuth-reference/completion.md); operator confirms 0° at midpoint, 90° right and 275° left. Quantitative accuracy/calibration remains ASTT-046/047/049
- [ ] **ASTT-044** Integrate and calibrate the EL encoder and reference angle. — CRITICAL; model and wiring still to confirm
- [ ] **ASTT-045** Calibrate motor direction, PWM, deadband, and stopping for both axes. — Critical
- [ ] **ASTT-046** Qualify encoder accuracy and repeatability. — High
- [ ] **ASTT-047** Qualify magnetometer and heading measurements. — [LATER HIGH](agents/work/047-qualify-magnetometer/prompt.md); automatic referencing deferred
- [ ] **ASTT-048** Qualify the GPS subsystem. — Medium
- [ ] **ASTT-049** Qualify the AZ motion subsystem independently. — Critical
- [ ] **ASTT-050** Qualify the EL motion subsystem independently. — CRITICAL; physical connection/calibration under ASTT-055/044 first
- [ ] **ASTT-051** Qualify the E-stop and motion limits. — Critical

### 7. Full-system Point and Track integration — 5/8 complete

- [x] **ASTT-052** Send Point commands from GUI to backend to hardware. — Sanele
- [x] **ASTT-053** Send Track commands from GUI to backend to hardware. — Sanele
- [x] **ASTT-054** Calculate source-based AZ targets. — Sanele
- [ ] **ASTT-055** Connect and verify physical EL movement without breaking AZ Point. — [CRITICAL; reopened](agents/work/055-elevation-control/prompt.md); wiring, calibration, and bench verification pending
- [ ] **ASTT-056** Complete continuous Track mode with physical AZ and EL movement. — Critical
- [x] **ASTT-057** Return actual AZ, EL, and sensor telemetry during movement. — Critical
- [x] **ASTT-058** Display live movement and telemetry in the GUI. — High
- [ ] **ASTT-059** Test source to command to movement to feedback end to end. — Critical

### 8. Experimental validation — 0/9 complete

- [ ] **ASTT-060** Define a repeatable AZ/EL test procedure and reference. — Critical
- [ ] **ASTT-061** Test targets across the usable AZ/EL range. — Critical
- [ ] **ASTT-062** Record desired and actual AZ/EL values. — Critical
- [ ] **ASTT-063** Repeat targets from both directions to measure backlash. — High
- [ ] **ASTT-064** Calculate angular error and repeatability. — High
- [ ] **ASTT-065** Plot desired position, actual position, and error. — High
- [ ] **ASTT-066** Run Point-mode qualification tests. — Critical
- [ ] **ASTT-067** Run an extended Track-mode qualification. — Critical
- [ ] **ASTT-068** Record final accuracy, limitations, and failure cases. — High

### 9. Documentation and delivery — 2/12 complete

- [x] **ASTT-069** Draft the AZ subsystem documentation. — Sanele
- [ ] **ASTT-070** Add the whole-system architecture diagram. — High
- [ ] **ASTT-071** Document component and breadboard design decisions. — Medium
- [ ] **ASTT-072** Update wiring and enclosure diagrams to match the final hardware. — High
- [ ] **ASTT-073** Document AZ/EL control and Point/Track flow. — High
- [ ] **ASTT-074** Add qualification and experimental results. — Critical
- [ ] **ASTT-075** Merge contributions into the main ASTT document. — High
- [ ] **ASTT-076** Build one whole-system presentation. — Critical
- [ ] **ASTT-077** Prepare and assign the 15-minute presentation script. — Critical
- [ ] **ASTT-078** Prepare a five-minute integrated Point and Track demo. — Critical
- [ ] **ASTT-079** Rehearse the demo and prepare a fallback recording or dataset. — High
- [x] **ASTT-080** Combine hardware and software into one agent-ready repository. — Sanele

## Immediate order

ASTT-043 now uses **manual initial alignment**. The operator confirms both raw
AZ stops (`137.8°`, `37.8°`) and clockwise 1:1 mapping. Their permitted-arc
midpoint is `267.8°`, used as configurable `encoderAtNorth`; the fixed offset is
`92.2°`. Manually place AZ at that midpoint, level the base and turn the base to
align the pointing direction with true north before sending a fresh command.
No centring, zeroing or old-command replay runs at startup. Per the latest
operator decision there is no additional UI/Serial alignment-confirmation gate;
the firmware assumes alignment and cannot detect repositioning. Stop and repeat
alignment after moving the base. This does not establish absolute accuracy.
The operator reports successful physical Point tests at 0° (midpoint), 90°
(right) and 275° (left), and accepts the manual-reference task as complete.
This functional result is not a measured error tolerance or full qualification.

The working compass initialization/retry/continuous reads are integrated as
diagnostics only in manual mode. Missing compass/declination cannot block manual
Point; celestial Track still requires real UTC. Raw travel checks, E-stop,
timeouts, source math, networking and command-ID protections remain. Automatic
magnetic referencing stays deferred under ASTT-047.
ASTT-092 adds a shared Serial/API diagnostic snapshot and Show more in reading
views. ASTT is running on 8000/4200 after the user-approved auto-scheduler app stop;
upload the revised `.ino` once to populate the new reading diagnostic field.
ASTT-093 moves HTTP to an ESP32 worker so feedback/E-stop checks continue during
requests and raises AZ minimum PWM from 140 to 210. Its former live-compass AZ
telemetry is superseded by encoder-derived AZ in manual mode.
Telescopes uses latest-reading health and Last seen; stale devices have gray rows
without an Offline label. Smoothness, higher-power stopping and E-stop timing
still require supervised hardware checks; nothing was flashed or committed.

Next is ASTT-055 elevation. The operator confirms 0–90° travel and channel-B
wiring, and now describes the MPU on the back of the moving dish with +Y up.
Confirm the actual MPU address/count and readings at known elevations before
choosing its tilt formula; that mounting must not be guessed from the older
two-MPU draft. Raw/stale-feedback safeguards and independent stopping checks
remain pending under ASTT-055/050. Combined demo qualification remains ASTT-078.
A completed Point must stay stopped until a fresh command. Permanent mounting
and enclosure under ASTT-036/037/038 are LATER HIGH, coordinated with teammates.
Keycloak and cosmetic frontend work stay at the end.
