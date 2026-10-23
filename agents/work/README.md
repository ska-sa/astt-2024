# Work-item records

Create one folder per non-trivial task:

```text
agents/work/NNN-short-title/
├── prompt.md
└── completion.md
```

Use the existing `ASTT-NNN` number from the root checklist. The next number for
a new, unlisted item is **094**. Current project progress is **40/80 complete**.

## Demo plan revised 2026-10-23

- **DONE, manual-demo scope:** [ASTT-043: Manual AZ reference and compass integration](043-azimuth-reference/completion.md).
  Fixed permitted-arc midpoint 267.8°, encoder-derived AZ, compass diagnostics;
  no new alignment buttons or automatic startup motion. Operator manually
  levels/north-aligns before a fresh command. Operator reports 0° midpoint,
  90° right and 275° left working; quantitative accuracy remains unqualified.
- **NEXT CRITICAL, mounting clarification:** [ASTT-055: Elevation feedback](055-elevation-control/prompt.md).
  Keep measured tilt before clamping, stale/invalid feedback stops and verified
  travel/margins. Confirm which MPU is moving and its measured mounting before
  changing the older EL draft; no agent-powered test is authorized.
- **TODO CRITICAL:** ASTT-078 Point/Track qualification and demo.
- **LATER HIGH:** ASTT-047 magnetic qualification and ASTT-036/037 mounts/enclosure.

Physical qualification remains open. The count increased for operator-accepted
manual AZ functional tests, not for software tests or magnetic calibration.

## Software verified 2026-10-22

- [ASTT-093: Continuous AZ feedback and live device status](093-continuous-az-motion/completion.md)
  — HTTP worker, minimum AZ PWM 210 and gray stale-device rows; current manual
  AZ is encoder-derived. Powered smoothness/stopping remains pending, so the
  checklist stays open.
- [ASTT-092: Remote reading diagnostics and sensor health](092-reading-diagnostics/completion.md)
  — optional reading log, truthful health/status, collapsed diagnostics, and
  preserved database verified; user still uploads the revised firmware.

## Follow-ups prioritised 2026-10-22

- **CRITICAL:** [ASTT-055: Connect and verify elevation](055-elevation-control/prompt.md),
  with ASTT-044 encoder calibration and ASTT-050 physical qualification.
- **LATER HIGH:** ASTT-036/037 permanent mounts/enclosure and ASTT-038 assembly,
  coordinated with teammates. Their deferred draft records remain uncommitted.

## Software verified 2026-10-19

- [ASTT-084: UI hold-position button](084-ui-stop/completion.md) — frontend tests
  and production build passed; not a physical E-stop or hardware qualification.

Physical elevation work reuses ASTT-055 (reopened), ASTT-042 (relative zero),
ASTT-044 (encoder integration/calibration), and ASTT-050 (qualification).
No new capability is marked complete merely by logging these drafts.
