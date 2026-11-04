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

**45 of 92 work items complete.** The checklist is the project source of truth.
Only mark an item complete after its acceptance criteria have been verified.
ASTT-055 basic encoder-feedback EL Point movement is complete: the operator
confirms it works in both directions on 2026-10-30. On 2026-11-04 the operator
confirms both axes now move and hold correctly, with EL offset +70.37° and
0.1° tolerance on both axes. Measured EL limits, independent reference/accuracy
checks and full qualification remain open; automatic north-finding is deferred.

### 1. Software and backend foundation — 17/21 complete

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
- [ ] **ASTT-086** Replace password entry with a received single-use sign-in code and verified session. — [Draft](agents/work/086-passwordless-login/prompt.md)
- [ ] **ASTT-087** Let device owners add and remove read-only viewers. — [Draft](agents/work/087-device-viewer-access/prompt.md)

- [x] **ASTT-097** Add Simple/Raw CAM reading views. — [Software verified](agents/work/097-cam-reading-views/completion.md)
- [x] **ASTT-098** Add AZ/EL gauges with range shading and GPS. — [Software verified](agents/work/098-cam-angle-gauges/completion.md); EL travel limits remain ASTT-044

- [x] **ASTT-099** Use signed UI Point angles with one-time initial targets. — [Software verified](agents/work/099-ui-signed-pointing/completion.md); API/firmware unchanged

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

### 3. Motion control — 4/8 complete

- [x] **ASTT-021** Assemble the AZ mechanical parts and motor bracket.
- [x] **ASTT-022** Complete the AZ motor-driver and control wiring.
- [x] **ASTT-023** Update MCU firmware to drive AZ movement.
- [x] **ASTT-024** Verify closed-loop AZ movement and encoder feedback.
- [ ] **ASTT-096** Replace the EL motor with a faster suitable motor and retest loaded movement/stopping. — [IN PROGRESS HIGH](agents/work/096-faster-el-motor/prompt.md)
- [ ] **ASTT-094** Use signed midpoint-zero coordinates and reliable encoder-based two-axis Point control. — [TODAY CRITICAL](agents/work/094-encoder-mechanical-coordinates/prompt.md)
- [ ] **ASTT-093** Remove network-induced AZ pauses, raise minimum PWM, and show live measured AZ/device status. — [Software verified; supervised motion pending](agents/work/093-continuous-az-motion/completion.md)
- [ ] **ASTT-091** Add automatic recovery after external repositioning. — [LATER HIGH; deferred](agents/work/091-repositioning-recovery/prompt.md); whole-base/reference recovery deferred; AZ/EL encoder holding confirmed under ASTT-045

### 5. Mechanical integration and enclosure — 2/9 complete

- [x] **ASTT-032** Design and print the laser bracket. — Sanele
- [x] **ASTT-033** Integrate the ASTT AZ mechanical assembly. — Sanele
- [ ] **ASTT-034** Repair or reprint the AZ motor and encoder gears. — High
- [ ] **ASTT-035** Complete the EL mechanical assembly. — Critical
- [ ] **ASTT-036** Build the rear electronics enclosure. — [IN PROGRESS HIGH](agents/work/036-permanent-mounting-enclosure/prompt.md); coordinate with teammates
- [ ] **ASTT-037** Make the phone holder on the AZ gear for later MPU/magnetometer comparison. — [IN PROGRESS HIGH](agents/work/037-sensor-connector-mounts/prompt.md); preserve cable clearance
- [ ] **ASTT-038** Print and assemble the approved enclosures/mounts. — HIGH; follow ASTT-036/037/095 designs
- [ ] **ASTT-095** Make the front-dish laser distance-meter enclosure/mount. — [TODO HIGH](agents/work/095-front-distance-meter-mount/prompt.md); used for later three-point validation
- [ ] **ASTT-039** Verify movement does not strain or entangle power cables. — Critical

### 6. Calibration and subsystem qualification — 3/14 complete

- [x] **ASTT-040** Establish the true-north reference. — Sanele
- [x] **ASTT-041** Establish the telescope GPS location. — Sanele
- [ ] **ASTT-042** Set and verify the recorded EL encoder zero. — [TODAY CRITICAL](agents/work/042-elevation-reference/prompt.md); operator-confirmed EL offset +70.37°; independent accuracy/scale checks pending
- [x] **ASTT-043** Establish the manual AZ encoder reference. — [Done for the manual demo](agents/work/043-azimuth-reference/completion.md); operator confirms 0° at midpoint, 90° right and 275° left. Quantitative accuracy/calibration remains ASTT-046/047/049
- [ ] **ASTT-044** Read the newly available EL encoder and record limit-switch stop positions. — [IN PROGRESS CRITICAL](agents/work/044-elevation-encoder/prompt.md); upper raw stop 65.93° recorded; lower stop and scale pending
- [ ] **ASTT-045** Calibrate motor direction, PWM, deadband, and stopping for both axes. — Critical; operator confirms both axes move/hold with 0.1° tolerance; quantified calibration pending
- [ ] **ASTT-046** Qualify encoder accuracy and repeatability. — High
- [ ] **ASTT-047** Qualify magnetometer and heading measurements. — [LATER HIGH](agents/work/047-qualify-magnetometer/prompt.md); automatic referencing deferred
- [ ] **ASTT-048** Qualify the GPS subsystem. — Medium
- [ ] **ASTT-049** Qualify the AZ motion subsystem independently. — Critical
- [ ] **ASTT-050** Qualify the EL motion subsystem independently. — CRITICAL; physical connection/calibration under ASTT-055/044 first
- [ ] **ASTT-051** Qualify the E-stop and motion limits. — Critical
- [ ] **ASTT-089** Show MPU-based base tilt and Level / Needs levelling / Unknown status. — [Draft](agents/work/089-base-level-indicator/prompt.md)
- [ ] **ASTT-090** Detect low-power motor hum and test a bounded PWM increase with stall protection. — [Logged](agents/work/090-motor-startup-power/prompt.md); follow-up to ASTT-045

### 7. Full-system Point and Track integration — 7/8 complete

- [x] **ASTT-052** Send Point commands from GUI to backend to hardware. — Sanele
- [x] **ASTT-053** Send Track commands from GUI to backend to hardware. — Sanele
- [x] **ASTT-054** Calculate source-based AZ targets. — Sanele
- [x] **ASTT-055** Implement basic encoder-feedback EL Point movement in both directions. — [Operator confirmed 2026-10-30](agents/work/055-elevation-control/completion.md); limits/zero and full qualification remain ASTT-044/042/050/051/094
- [x] **ASTT-056** Complete continuous Track mode with physical AZ and EL movement. — [Operator confirmed](agents/work/056-continuous-tracking/completion.md); one-minute test pattern works reliably; quantified accuracy and extended qualification remain separate tasks
- [x] **ASTT-057** Return actual AZ, EL, and sensor telemetry during movement. — Critical
- [x] **ASTT-058** Display live movement and telemetry in the GUI. — High
- [ ] **ASTT-059** Test source to command to movement to feedback end to end. — Critical

### 8. Experimental validation — 0/10 complete

- [ ] **ASTT-060** Plan three-point laser distance-meter / triangle validation after reliable motion. — [TODO CRITICAL](agents/work/060-three-point-validation/prompt.md); independent geometry and paired readings
- [ ] **ASTT-061** Test targets across the usable AZ/EL range. — Critical
- [ ] **ASTT-062** Record desired and actual AZ/EL values. — Critical
- [ ] **ASTT-063** Repeat targets from both directions to measure backlash. — High
- [ ] **ASTT-064** Calculate angular error and repeatability. — High
- [ ] **ASTT-065** Plot desired position, actual position, and error. — High
- [ ] **ASTT-066** Run Point-mode qualification tests. — Critical
- [ ] **ASTT-067** Run an extended Track-mode qualification. — Critical
- [ ] **ASTT-068** Record final accuracy, limitations, and failure cases. — High
- [ ] **ASTT-088** Replay a selected Sun trajectory in 30 minutes or less and save paired tracking-error data. — [Draft](agents/work/088-compressed-sun-tracking/prompt.md)

### 9. Documentation and delivery — 2/12 complete

- [x] **ASTT-069** Draft the AZ subsystem documentation. — Sanele
- [ ] **ASTT-070** Add the whole-system architecture diagram. — High
- [ ] **ASTT-071** Document component and breadboard design decisions. — Medium
- [ ] **ASTT-072** Update wiring and enclosure diagrams to match the final hardware. — High
- [ ] **ASTT-073** Document AZ/EL control and Point/Track flow. — High
- [ ] **ASTT-074** Add qualification and experimental results. — Critical
- [ ] **ASTT-075** Merge contributions into the main ASTT document. — High
- [ ] **ASTT-076** Build one whole-system presentation. — Critical
- [ ] **ASTT-077** Prepare the whole-system presentation script after motion tests/calibration. — [TODO CRITICAL](agents/work/077-system-presentation-script/prompt.md); use actual results and limitations
- [ ] **ASTT-078** Demonstrate separate then combined AZ + EL mechanical Point movement. — [TODO CRITICAL](agents/work/078-integrated-point-track-demo/prompt.md); Track/absolute accuracy are later
- [ ] **ASTT-079** Rehearse the demo and prepare a fallback recording or dataset. — High
- [x] **ASTT-080** Combine hardware and software into one agent-ready repository. — Sanele

## Immediate order — 2026-11-04

**Both axes now move and hold correctly, confirmed by the operator.** Preserve
this working controller and sensor sampling. Both tolerances are 0.1°; the
operator's final EL correction is `EL_ENCODER_OFFSET=-19.63+90` (net +70.37°).
The faster EL motor is fitted; quantitative loaded/electrical qualification
remains ASTT-096/050. Automatic north-finding is deferred.

1. **EL travel protection — ASTT-044/051:** record both current raw stop readings,
   check limit-switch/E-stop behavior, then enforce measured software limits with
   stopping clearance. Preserve AZ's verified raw arc `137.8° → 360°/0° → 37.8°`.
   EL UI −15°…+92° is still a requested range, not a measured travel range. With
   the current offset, zero maps to raw 289.63°; the historical upper raw 65.93°
   would display 136.3°, so remeasure the current assembly instead of reusing a
   stale endpoint or inventing a scale.
2. **Rigid mounting — ASTT-036/037/038/095:** finish/print the rear electronics
   enclosure, phone holder on the AZ gear and front laser distance-meter mount.
   Coordinate with teammates and verify cable clearance (ASTT-039).
3. **Independent pointing tests — ASTT-042/046/049/050/060–068:** manually align
   north and the elevation reference, then use three-point/triangle measurements.
   Record requested, encoder-reported and independently measured positions;
   test both approach directions, repeatability and combined two-axis movement
   (ASTT-094/059/078). Adjust references only from those results.
4. **Presentation — ASTT-076/077/079:** prepare the whole-system slides/script,
   real results and limitations, then rehearse with a fallback recording.

The MPU/magnetometer automatic reference, curve fitting, Sun replay, login/
sharing and cosmetic work remain later tasks. Encoder-based holding is working;
whole-base/reference recovery remains ASTT-091. Basic movement does not by
itself establish absolute pointing accuracy or complete travel qualification.

The previous code and untracked work are saved locally in `stash@{0}`,
`2026-10-30 before encoder-first AZ-EL milestone` (`be08154`). Only backlog/work
records were restored after stashing. The EL reader/UI was accepted and pushed as
`4da6e3c`; subsequent EL movement is operator-tested and approved for commit/push. The agent
has not flashed hardware or sent motor commands. Only ASTT's backend was restarted
with operator approval for the display fix; the database was retained.
