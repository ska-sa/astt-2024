# ASTT-045 progress notes

**Status:** Ready for safe bench measurements

## Prepared

- Added a one-axis-at-a-time motor calibration procedure.
- Included checks for direction, minimum useful PWM, overshoot, and stopping.
- Added measurement tables for both movement directions on both axes.
- Kept firmware constants unchanged until physical measurements are available.

## Verification

- Procedure requires ASTT-051 E-stop checks before motor power is applied.
- Procedure keeps the unused axis disconnected.
- No firmware was flashed and no hardware was powered or moved.

## Remaining physical checks

- Verify the E-stop and physical travel limits.
- Measure motor direction and minimum useful PWM for each axis.
- Measure stopping error from both directions.
- Update firmware constants only from the recorded results.

## EL-only trial — 2026-11-02

- Grouped EL minimum/maximum PWM (255/255) and reduced tolerance 1° → 0.01°.
- EL stops within tolerance or on crossing its target, without automatic reversal
  or replay of the completed Point. New commands reset its direction state.
- Sensor functions/timing, AZ, networking, reference math, pins and E-stop remain
  unchanged from the operator-confirmed master baseline. Earlier experiments
  stay stashed; none were reapplied.
- Host regression suite passes, including 129,600 AZ paths, EL full-power motion
  near target, stopping in both directions, crossing/wrap, new commands, stale
  feedback, timeout and E-stop. Physical stopping/accuracy remain unverified.
- No flashing or powered commands. Physical calibration task remains open.
- Arduino compile passed for `esp32:esp32:lolin32` (ESP32 core 3.3.12):
  1,031,763 bytes flash (78%); 53,980 bytes global RAM (16%).

## Faster EL motor trial — 2026-11-03

- Reduced EL minimum PWM 255 → 210, matching the unchanged AZ minimum.
  EL maximum remains 255; the existing 30° error-based ramp now reduces PWM
  as the target approaches. Tolerance, zero reference, sensors and control logic
  are unchanged by this trial. Physical testing remains underway.
- Existing host regressions pass, with adjusted checks for near-target power,
  ramped power in both directions, target crossing and command/fault handling.
- LOLIN32 compile and `git diff --check` pass. No flash, motor command, commit
  or push. ASTT-096 records the faster motor report; qualification remains open.

## AZ settling and target-hold trial — 2026-11-04

- Latest inspected reading 26767 reported AZ 358.3712° (−1.6288°), target 0°,
  `AZ POINT COMPLETE`, PWM 0. The previous completion latch prevented correction;
  this snapshot alone does not establish whether the error came from coasting,
  backlash or earlier overshoot.
- AZ retains the operator's 140/255 PWM, 60° ramp and 0.1° tolerance. Within 2°,
  corrections use nominal 80 ms pulses with 300 ms settling; reversal also waits.
  Timing is checked by the existing loop, not a hardware timer: blocking sensor
  reads can extend a pulse. Holding remains armed only while the command/feedback
  remain valid. No new motion-fault heuristic or automatic power boost.
- Added signed `azSpeed_dps` (existing filtered encoder, at least 250 ms interval)
  and `azError` to the same Serial/API line. Speed does not alter sensor samples.
- CAM inputs round to at most two decimals after editing and when initialized or
  submitted. Hold payloads and stored/live readings retain their original precision.
- Preserved all sensor readers, EL motion/settings, references, limits, pins,
  network worker and command timeout/E-stop cancellation. This supersedes the
  old AZ arrival latch for encoder-visible error only; ASTT-091 reference recovery
  is still deferred.
- Host checks cover 129,600 safe paths plus pulsing/settling, both reversal
  directions, wraparound, hold, repeated IDs, blocked travel, timeout, feedback
  loss, E-stop, speed validity and the existing EL/network behavior.
- Focused frontend checks: 68 passed (CAM, Readings, Commands). LOLIN32 compile
  passed; physical 0.1° accuracy is not established by software tests.

### Operator test

1. Upload after review; use the current manual reference and a fresh Point ID.
2. With clearance from both stops, approach a reachable target from each
   direction, then try small 0.2–1° changes. Record settled error and any hunting.
3. Check `azSpeed_dps`, `azError` and `reqPWM` in Serial/Show more. Short pauses
   near arrival are intentional; report hum/no movement or repeated overshoot.
4. Confirm E-stop stops both axes and release/same-command polling cannot resume;
   repeat the communication-timeout check before leaving unattended.

No flashing, powered command, service restart, commit or push performed.

## Power-curve trial reverted — 2026-11-04

The operator reports the nonlinear experiment did not work and requests the
previous working version for another test before committing. Restored the exact
saved sketch: linear ramp, AZ PWM 150–255, tolerance 0.1°, fine range 1°,
80 ms corrections and 300 ms settling, with active target hold and speed logs.
Byte comparison against the pre-trial backup passes. EL, sensor sampling and UI
are unchanged by this rollback. Test expectations/docs now match the operator's
150 PWM / 1° settings that preceded the experiment. Physical retest is pending;
no flashing, commands, commit or push.

Verification: firmware regressions (including 129,600 safe AZ routes), LOLIN32 compilation, and `git diff --check` pass.

The operator confirms the restored AZ version is satisfactory and authorizes saving it to master before the separate EL hold/settling trial. Quantified two-axis qualification remains open.
