# ASTT-090 software trial — 2026-11-04

**Status:** Basic operation accepted by the operator on 2026-11-05; loaded/stall qualification remains open.

The operator-accepted Point/Track version was committed and pushed to master as
`95e0617` before this experiment. The operator now confirms the revised settings
work and requests committing/pushing them before further Track/UI work.

## Changes

- A background task collects the existing HIGH/LOW PWM measurements into seven-value
  windows. Circular median plus 0.5 smoothing filters spikes and 360/0 wrapping.
  A one-entry queue passes the newest snapshot to the motor loop without waiting.
- Feedback expires after 250 ms. Startup/recovery needs seven fresh samples;
  filtered values from before a long sampling gap are discarded.
- Both signed encoder speeds are measured over at least 250 ms and appear as
  `azSpeed_dps`/`elSpeed_dps`, with `boost=AZ/EL`, in Serial and API `serial_log`.
- Continuous travel outside the 1° fine zone checks progress each second. Less
  than 0.1°/s adds 15 PWM, capped at +100 for AZ or +60 for EL and the axis maximum.
  Ten seconds without sufficient AZ progress (five for EL), or clear
  wrong-direction movement, stops both axes.
  A fresh command is required to clear the latched motion fault.
- Useful assistance remains while moving; stops, reversal, new commands and fine
  corrections reset it. Existing short corrections, limits, references, tuning,
  command flow, source equations and asynchronous HTTP are retained.

Only encoder pulse waits moved out of the control loop. Existing I2C/GPS work still
runs there; this is not a guarantee of fixed control-loop latency. Worker scheduling,
filter lag and actual pulse capture stability need hardware measurements. EL has
physical power-cut limit switches but no newly measured software travel endpoints.

## Verification

- `python3 hardware/tests/test_azimuth_control.py` passes. Includes 129,600 safe AZ
  routes, circular outliers, warmup, overwritten snapshots, stale/recovered data,
  clock wrapping, speed, worker startup failure, capped assistance, slow progress,
  fault/no-auto-retry, E-stop, timeout and existing Point/two-axis Track checks.
- LOLIN32 Arduino compile passes with ESP32 core 3.3.12: 1,040,079 bytes flash (2026-11-05 revision),
  54,116 bytes static RAM. Build artifacts are outside the repository.
- No device upload, motor command, live service change or physical accuracy claim.

## Short operator test after upload

1. With motor power off, compare stationary encoder jitter and slow manual movement
   with the accepted version. Check both directions and a reachable wrap crossing.
2. With clearance and E-stop available, make short separate AZ and EL moves, then
   together. Check speed sign, settling, repeatability and return to the target.
3. Inspect speed/PWM/boost during an ordinary stiff section: assistance should rise
   only during continuous slow travel and clear on stop or fine correction. Do not
   deliberately jam a powered motor; stop if behavior is unexpected.
4. With motor power disconnected, a request outside the fine zone should stop after
   the ten-second AZ or five-second EL no-progress budget. Check stale feedback, E-stop and command
   timeout also stop movement; repeated IDs must not restart it.
5. Recheck the one-minute test source and record logs before accepting the draft.

## AZ adjustment — 2026-11-05

The operator reports the buffered-feedback draft works but AZ still sticks in
some positions, and requests slightly more power and a longer assistance window.
AZ minimum PWM is restored to 150 as explicitly requested. Maximum extra
assistance increases from 80 to 100 and the no-progress timeout from seven to
ten seconds. Maximum PWM remains 255. Encoder sampling, EL settings, tolerances
and fine-correction timings are unchanged.
The controller regression suite passes, including AZ’s extended window/cap and
EL’s unchanged five-second stop. Arduino LOLIN32 compilation also passes
(1,040,079 bytes flash, 54,116 bytes static RAM). No upload or live motor command was performed by the agent. The operator
confirms the final settings work; loaded/stall qualification still needs measurements.
