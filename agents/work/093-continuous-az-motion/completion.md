# ASTT-093 verification

**Status:** Software checks passed; powered verification pending
**Date:** 2026-10-22

The old loop explicitly stopped both motors before HTTP every two/five seconds.
HTTP now runs in one ESP32 task. Only copied scalar/fixed-buffer messages cross
queues; the main loop alone owns sensor reads, targets, reference and GPIO/PWM.
Replies are generation/age checked after current feedback and E-stop checks.
E-stop is checked again after sensor waits, before accepting commands or driving.
Startup allocation failure disables outputs; repeated IDs cannot restart Point.

AZ minimum PWM is 210 (140 x 1.5), maximum 255. Displayed AZ is live raw-compass
heading plus the existing local declination; the encoder still controls internal
error, stopping and limits. No magnetic calibration or EL feature was added.
Bad heading samples retain the last compass estimate with FAULT/STALE diagnostics.

The Telescopes table reads sensor health from the latest reading and shows
Last seen. Unavailable devices have gray rows, without Online/Offline labels.
No endpoint, schema or backend change was needed for this task.

## Verification

- LOLIN32 compile passed: 1,031,215 bytes flash (78%), 53,980 bytes globals (16%).
  No flash/upload performed. Runtime queues/worker also allocate heap/stack.
- `python3 hardware/tests/test_azimuth_control.py` passed: 129,600 raw route cases,
  compass/date, IDs/completion, timeouts, health/diagnostics, copied bounded queue
  messages, allocation failures, delayed replies and E-stop/feedback-loss cases.
- Final gray-row version: Angular CAM/Readings/Telescopes combined 53/53 passed;
  production build passed (existing CanvasJS/Bootstrap warnings only).
- Source/elevation calculation functions unchanged; diff whitespace check clean.

## Files changed in this task

- `hardware/wemos_lilon32/wemos_lilon32.ino`
- `hardware/tests/test_azimuth_control.py`
- `software/frontend/src/app/components/telescopes/telescopes.component.ts`
- `software/frontend/src/app/components/telescopes/telescopes.component.html`
- `software/frontend/src/app/components/telescopes/telescopes.component.spec.ts`
- `hardware/README.md`
- `hardware/magnetometer-test.md`
- `software/README.md`
- `README.md`
- `agents/work/README.md`
- `agents/work/093-continuous-az-motion/prompt.md`
- `agents/work/093-continuous-az-motion/completion.md`

Earlier unrelated/previous-turn worktree changes were preserved, not reverted.

## Operator checks still needed

Use the current true-heading allowed arc, not old raw encoder test angles.
Keep EL disconnected; start with a short interior AZ move and physical E-stop
accessible. Check motion through several command/telemetry cycles, overshoot,
repeatable stopping and E-stop/no automatic resume. Then check communication
timeout under supervision. Do not deliberately jam the motor. Raw opposite
stop, encoder mapping and compass accuracy are still unqualified. Sensor reads
still have pulse/I2C waits, so this is not a hard-real-time E-stop guarantee.

No commit, push, flash, motor energizing, port/container changes or live command
POST was performed for this task. ASTT-093 remains open until physical checks.
