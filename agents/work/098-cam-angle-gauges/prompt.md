# ASTT-098: AZ and EL gauges with GPS

**Status:** Complete — software verified 2026-11-02
**Area:** Software

## Context and goal

The operator wants a minimal pointing display instead of a wall of sensor numbers.
This scope was explicitly requested on 2026-11-02; no additional approval is needed.

## In scope

Use lightweight SVG gauges in Simple: a top-view AZ compass (0° up, N/E/S/W), an EL quarter-circle (0° right/horizon, 90° up), larger numeric readings just outside the arrow tips, drawn in front on white backgrounds, and GPS below. Show allowed AZ travel in gray and unused travel in white using existing metadata including wraparound. Follow existing Bootstrap styling and fit mobile screens.

## Out of scope

Firmware, backend, coordinate/reference changes, levelling indicators, new dependencies,
commands, calibration and physical accuracy claims.

## Decisions and questions

Use the existing readings/metadata and native SVG; no unresolved interface decisions.
Unknown EL travel limits stay under ASTT-044, with reference work under ASTT-042/094.

## Acceptance criteria

- [x] Readings use the API angles as-is; do not add the reference offset twice.
- [x] AZ allowed arc uses raw limits plus the published offset and does not rotate with the measured AZ.
- [x] EL has no measured range metadata yet: display its 0–90° quadrant without claiming travel limits; keep off-scale numbers exact and omit off-scale needles.
- [x] Verify live updates, unavailable values, desktop/mobile layout and the production build.

## Likely files

CAM component/template/styles/tests, software README and work checklist.

## Verification

Focused Angular tests, production build, isolated desktop/mobile browser checks.
No motor commands, hardware tests or service restarts.
