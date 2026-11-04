# ASTT-056: Repair Track storage and enable two-axis tracking

**Status:** Operator-confirmed basic continuous tracking — 2026-11-04
**Area:** Backend / firmware

The operator confirmed both Point axes and requested a small Track fix after a
backend exception, plus a separate accelerated motion-pattern source. Keep the
existing Sun source, encoder readers, Point tuning, pins and offsets unchanged.

- Remove command-history source-name uniqueness; preserve records/IDs and return
  the inserted command, including when the same source is selected again.
- Feed calculated Track AZ/EL into the working encoder controllers. Pause both
  axes for below-horizon or unreachable targets; keep E-stop/timeout/fault cancellation.
- Add a named 1-minute synthetic pattern with the existing source fields.
  The operator explicitly permits a test pattern instead of a true Sun replay.
  Follow-up: adjust this source to stay above the local horizon for the entire
  cycle, with both axes inside the existing travel range. The latest request
  shortens the period from 5 minutes to 1 minute without changing the arc.
- Verify isolated persistence/command regressions, actual firmware math/control
  and LOLIN32 compilation. Physical tracking still requires operator testing.
- No flash, live motion commands, commit or push in this task.

The pasted research output compresses a YEAR into 30 minutes using elapsed
minutes. Firmware evaluates day-based coefficients in UTC. Use separately
calculated day-based pattern coefficients; never overwrite the Sun with the
pasted accelerated coefficients. ASTT-088 remains for a dated solar replay and
paired tracking-error records.
