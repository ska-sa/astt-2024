# ASTT-097: Simple and Raw CAM reading views

**Status:** Complete — software verified 2026-11-02
**Area:** Software

## Context and goal

The operator wants a minimal pointing display instead of a wall of sensor numbers.
This scope was explicitly requested on 2026-11-02; no additional approval is needed.

## In scope

Default to Simple, with a Simple/Raw button group matching Point/Track. Keep all existing sensor values and escaped Serial diagnostics available in Raw. Retain live updates, freshness and measured health. Leave commands and the history graph unchanged.

## Out of scope

Firmware, backend, coordinate/reference changes, levelling indicators, new dependencies,
commands, calibration and physical accuracy claims.

## Decisions and questions

Use the existing readings/metadata and native SVG; no unresolved interface decisions.
Unknown EL travel limits stay under ASTT-044, with reference work under ASTT-042/094.

## Acceptance criteria

- [x] Simple opens by default; Raw exposes every existing sensor group and diagnostics.
- [x] Toggling is accessible and never submits a command or changes entered targets.
- [x] Both views continue updating with existing polling; missing feedback stays unavailable.

## Likely files

CAM component/template/styles/tests, software README and work checklist.

## Verification

Focused Angular tests, production build, isolated desktop/mobile browser checks.
No motor commands, hardware tests or service restarts.
