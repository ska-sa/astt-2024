# ASTT-090: Buffered encoder feedback and bounded motor assistance

**Status:** Operator accepts basic operation on 2026-11-05; loaded/stall qualification remains open
**Area:** Hardware; follows ASTT-045/046

## Request

Commit/push the operator-accepted Track version first. Then keep encoder readings
stable with a small rolling sample buffer, reduce motor-loop blocking, log both
axis speeds, and gradually add bounded power when commanded movement is too slow.
Keep the implementation in the existing sketch and preserve working tuning.

## Scope

- Retain the PWM duty equation and 25 ms pulse timeouts; collect seven samples
  per axis in a background task. Share only the newest filtered snapshot.
- Reject stale feedback after 250 ms; refill the window after a sampling gap.
- Preserve pins, offsets, tolerances, fine corrections, raw AZ path,
  E-stop, command timeout, Track math, telemetry units and networking.
- During continuous travel outside the 1° fine zone, observe progress each second.
  Trial values: minimum progress 0.1°/s and +15 PWM steps, capped by each axis’s
  maximum. Per the 2026-11-05 request, AZ minimum PWM is 150, extra assistance
  is capped at +100 and no-progress timeout is ten seconds. EL retains its
  existing PWM range, +60 cap and five-second timeout.
- Stop both axes on sustained lack of progress or clear wrong-direction movement.
  Require a fresh command to retry; repeated polling must not re-arm it.
- Retain useful boost while moving; reset on stop, reversal, new command or fine
  correction. Add both signed speeds and extra PWM to the existing diagnostic line.

## Limits and open measurements

No encoder progress does not establish whether the cause is low power, a jam or
a physical limit. Assistance is time/power bounded, not a torque controller.
Physical EL switches cut power; software EL endpoints still need measurement.
Do not invent limits, bypass faults, alter reference sensors, or flash/run motion.
The observation window and boost limits are conservative software trial settings;
the operator must qualify them with the real load and speed under ASTT-045/050.

## Acceptance

- [x] Buffered samples handle spikes/wrapping, startup, expiry and recovery.
- [x] Motor-loop encoder reads do not wait for pulses; only the worker samples pins.
- [x] Software checks cover speed, bounded assistance, stopping, fresh-command
  recovery, timeout/E-stop and existing Point/Track behavior; firmware compiles.
- [ ] Operator verifies stable feedback and normal/slow movement on both axes.
- [ ] Loaded power, stopping and no-progress behavior are physically qualified.

The operator now requests committing and pushing the working changes before
further Track/UI work. The earlier controller/Track checkpoint is `95e0617`.
