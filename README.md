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

**28 of 81 work items complete.** The checklist is the project source of truth.
Only mark an item complete after its acceptance criteria have been verified.

### 1. Software and backend foundation — 11/12 complete

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

### 2. Electronics and sensor integration — 8/9 complete

- [x] **ASTT-012** Connect the MCU to the backend over Wi-Fi and HTTP. — Sanele
- [x] **ASTT-013** POST telescope telemetry and readings. — Sanele
- [x] **ASTT-014** GET the latest Point and Track commands. — Sanele
- [x] **ASTT-015** Resolve ESP32 and ADC pin conflicts. — Sanele
- [x] **ASTT-016** Fix sensor-reading issues and verify basic accuracy. — Sanele
- [x] **ASTT-017** Integrate azimuth encoder feedback. — Sanele
- [x] **ASTT-018** Integrate magnetometer and true-north measurement. — Sanele
- [x] **ASTT-019** Integrate GPS location information. — Sanele
- [ ] **ASTT-020** Build the Veroboard circuit and bottom enclosure. — Uhone

### 3. Motion control — 0/4 complete

- [ ] **ASTT-021** Assemble the AZ mechanical parts and motor bracket.
- [ ] **ASTT-022** Complete the AZ motor-driver and control wiring.
- [ ] **ASTT-023** Update MCU firmware to drive AZ movement.
- [ ] **ASTT-024** Verify closed-loop AZ movement and encoder feedback.

### 4. Integrated electronics PCB — 0/7 complete

- [ ] **ASTT-025** Consolidate electronics and sensor interfaces onto one PCB.
- [ ] **ASTT-026** Decide which electronics rotate and which remain stationary. — High
- [ ] **ASTT-027** Design PCB connections for the MCU, drivers, encoders, sensors, E-stop, and power. — High
- [ ] **ASTT-028** Minimize moving cables so the rotating assembly mainly receives power. — High
- [ ] **ASTT-029** Review the schematic, pins, power, and connectors. — Critical
- [ ] **ASTT-030** Manufacture and assemble the PCB. — High
- [ ] **ASTT-031** Bench-test the PCB before telescope installation. — Critical

### 5. Mechanical integration and enclosure — 2/8 complete

- [x] **ASTT-032** Design and print the laser bracket. — Sanele
- [x] **ASTT-033** Integrate the ASTT AZ mechanical assembly. — Sanele
- [ ] **ASTT-034** Repair or reprint the AZ motor and encoder gears. — High
- [ ] **ASTT-035** Complete the EL mechanical assembly. — Critical
- [ ] **ASTT-036** Design the top enclosure around the integrated electronics. — High
- [ ] **ASTT-037** Include mounts for rotating sensors and connectors. — High
- [ ] **ASTT-038** Print the enclosure and assemble the electronics. — High
- [ ] **ASTT-039** Verify movement does not strain or entangle power cables. — Critical

### 6. Calibration and subsystem qualification — 2/12 complete

- [x] **ASTT-040** Establish the true-north reference. — Sanele
- [x] **ASTT-041** Establish the telescope GPS location. — Sanele
- [ ] **ASTT-042** Determine the zero-degree elevation reference. — Critical
- [ ] **ASTT-043** Calibrate the AZ encoder and reference angle. — Critical
- [ ] **ASTT-044** Calibrate the EL encoder and reference angle. — Critical
- [ ] **ASTT-045** Calibrate motor direction, PWM, deadband, and stopping for both axes. — Critical
- [ ] **ASTT-046** Qualify encoder accuracy and repeatability. — High
- [ ] **ASTT-047** Qualify magnetometer and heading measurements. — High
- [ ] **ASTT-048** Qualify the GPS subsystem. — Medium
- [ ] **ASTT-049** Qualify the AZ motion subsystem independently. — Critical
- [ ] **ASTT-050** Qualify the EL motion subsystem independently. — Critical
- [ ] **ASTT-051** Qualify the E-stop and motion limits. — Critical

### 7. Full-system Point and Track integration — 3/8 complete

- [x] **ASTT-052** Send Point commands from GUI to backend to hardware. — Sanele
- [x] **ASTT-053** Send Track commands from GUI to backend to hardware. — Sanele
- [x] **ASTT-054** Calculate source-based AZ targets. — Sanele
- [ ] **ASTT-055** Complete Point mode with physical AZ and EL movement. — Critical
- [ ] **ASTT-056** Complete continuous Track mode with physical AZ and EL movement. — Critical
- [ ] **ASTT-057** Return actual AZ, EL, and sensor telemetry during movement. — Critical
- [ ] **ASTT-058** Display live movement and telemetry in the GUI. — High
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
- [ ] **ASTT-071** Document component and PCB design decisions. — Medium
- [ ] **ASTT-072** Update wiring and PCB diagrams to match the final hardware. — High
- [ ] **ASTT-073** Document AZ/EL control and Point/Track flow. — High
- [ ] **ASTT-074** Add qualification and experimental results. — Critical
- [ ] **ASTT-075** Merge contributions into the main ASTT document. — High
- [ ] **ASTT-076** Build one whole-system presentation. — Critical
- [ ] **ASTT-077** Prepare and assign the 15-minute presentation script. — Critical
- [ ] **ASTT-078** Prepare a five-minute integrated Point and Track demo. — Critical
- [ ] **ASTT-079** Rehearse the demo and prepare a fallback recording or dataset. — High
- [x] **ASTT-080** Combine hardware and software into one agent-ready repository. — Sanele

## Immediate order

Build the complete Veroboard system, move both axes with feedback, close the
Point/Track loop, consolidate the PCB and enclosure, then calibrate and qualify
the complete system. Keycloak and cosmetic frontend work stay at the end.
