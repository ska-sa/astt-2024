# ASTT-093: Continuous AZ feedback and live device status

**Status:** Approved through the user's implementation request; powered verification pending
**Area:** Hardware | Software

## Context

Working AZ motion pauses before blocking command/telemetry HTTP calls. The user
requests smoother movement, 1.5x minimum AZ PWM, a live compass-referenced UI,
and latest sensor health on the Telescopes/device table.

## Goal

Remove scheduled HTTP motor pauses without pausing feedback/E-stop checks,
and make device status reflect current readings.

## In scope

- Keep the integrated firmware in one `.ino`; no calibration setup/sweep.
- One built-in ESP32 HTTP worker with copied bounded request/reply messages.
- Main-loop-only sensor, command, reference and motor ownership; preserve raw
  limits, command IDs, completion latch, timeout and E-stop protections.
- Minimum AZ PWM 140 to 210; retain maximum 255 and existing ramp/tolerance.
- Live compass AZ for telemetry/UI; fixed command reference and encoder feedback
  still determine safe paths, stopping and completion.
- Device-table latest reading health, Last seen and gray unavailable rows.

## Out of scope

Calibration/accuracy claims, limit expansion, automatic stall boosts, EL changes,
new API/schema, automatic repositioning recovery, flashing, commits or push.

## Decisions and questions

- User confirmed “timetables” means ASTT's Telescopes/device table.
- User explicitly selected a gray background and Last seen, without Offline label.
- Higher PWM does not establish speed/stopping safety; operator checks remain.

## Acceptance criteria

- [x] Network scheduling does not stop outputs or block sensor/physical E-stop loop.
- [x] Stale replies cannot revive commands after E-stop, feedback loss or timeout.
- [x] Compass display is independent of frozen encoder-based motion/error.
- [x] Focused host/UI checks and LOLIN32 compilation pass.
- [x] Existing telemetry units, source and elevation calculations are preserved.
- [ ] Operator verifies smooth interior motion, stopping/overshoot and E-stop.

## Likely files

Integrated firmware and host test, Telescopes component/template/spec, related
hardware/software documentation and checklist/work records.

## Verification

Host simulation, Arduino CLI compile only, focused Angular tests and production
build. No live commands, synthetic readings or motor operations.
