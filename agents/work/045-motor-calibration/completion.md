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
