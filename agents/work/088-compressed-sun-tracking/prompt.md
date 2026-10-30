# ASTT-088: Replay a solar day in 30 minutes and record tracking error

**Status:** Logged — confirm simulated interval and run controls before implementation
**Area:** Software and integration

## Context

The user wants a repeatable Sun-tracking experiment without waiting all day,
with saved desired/measured values for error analysis. Firmware tracking uses
real UTC; readings have measured angles and receipt time, not paired targets
or simulated timestamps.

## Goal

Generate a dated, site-specific Sun trajectory and replay it in 30 real minutes
or less, saving requested and measured AZ/EL throughout the run.

## In scope

- Select site/date, simulated UTC start/end, replay duration, and sampling.
- Generate reproducible true-north targets with a validated solar calculation.
- Use a separate simulation clock; leave NTP, OS time, and reading timestamps unchanged.
- Start with a dry run. Prefer a small runner using existing Point APIs if it
  avoids changing normal Track behavior or adding unnecessary endpoints.
- Respect travel limits, elevation range, E-stop, pause/stop, feedback health,
  and motor speed constraints. Do not silently clamp unreachable targets.
- Save run settings, reference/offset, simulated UTC, real elapsed time,
  requested/measured AZ/EL, paired command/reading IDs, and movement status.
- Record shortest signed circular AZ error and ordinary EL error. Flag stale
  or missing samples rather than comparing the wrong target and reading.
- Export a simple CSV and plot requested/measured angles and error.

## Out of scope

- Claiming live Sun tracking, long-duration stability, or absolute pointing
  accuracy from encoder feedback alone.
- Bypassing limits, changing the real clock, or automatically starting motors.

## Decisions and questions

- Assumption to confirm: compress a selected day's path into at most 30
  minutes, rather than replay only 30 minutes of real solar motion.
- Research reviewed on 2026-10-19 instead prints a **full year in 30 minutes**.
  Choose that interval versus the original day-replay request before implementation;
  do not overwrite day-based database coefficients with minute-based values.
- Confirm daylight versus a 24-hour interval, date/site, sampling, duration,
  error sign convention, and how unsafe segments are skipped/stopped.
- Hardware replay requires an approved stop path (ASTT-084/051), qualified
  movement/reference, and explicit operator approval. It does not complete
  ASTT-067 extended real-time tracking qualification.
- Relates to ASTT-056/059/060/062/064/065/068; keep data reusable by those tasks.

## Acceptance criteria

- [ ] Solar reference cases and simulation-to-real-time mapping pass.
- [ ] A deterministic dry run completes in the selected duration without hardware.
- [ ] Unsafe targets and stale feedback have explicit, tested outcomes.
- [ ] Valid samples save paired targets/measurements and both timestamps.
- [ ] CSV/graphs reproduce errors without shifting old readings.
- [ ] Hardware mode stays disabled until prerequisites and approval are satisfied.

## Likely files

- A small trajectory/replay runner and tests, with location chosen before implementation
- CAM/history controls and command/reading services as needed
- Run-data storage/export and experimental documentation

## Verification

Use fake time, deterministic solar cases, and fake command/telemetry clients.
Test north crossings, below-horizon targets, forbidden arcs, outages, pause/stop,
and timestamps before an operator-run physical experiment.
