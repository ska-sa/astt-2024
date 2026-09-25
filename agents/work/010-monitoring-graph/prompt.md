# ASTT-010: Add azimuth and elevation history graph

**Status:** Approved
**Area:** Software

## Context

The CAM page shows the latest sensor reading but does not show how the antenna
angles changed over time.

## Goal

Show historical measured azimuth and elevation angles for a selected date range.

## In scope

- Default the start and end dates to today.
- Let the user select a sampling frequency.
- Plot measured azimuth and elevation values in degrees.

## Out of scope

- Target-versus-actual comparison.
- Server-side sampling.
- Deriving an angle directly from raw magnetometer or gyroscope values.

## Decisions and questions

- Use the existing `azimuth_angle` and `elevation_angle` readings because they
  are already calculated position angles.
- Sample readings in the frontend to keep the API unchanged.

## Acceptance criteria

- [x] The graph defaults to today's readings.
- [x] The user can select start and end dates and a sampling frequency.
- [x] Azimuth and elevation are displayed as separate lines in degrees.
- [x] The Angular production build passes.

## Likely files

- `software/frontend/src/app/components/cam/cam.component.ts`
- `software/frontend/src/app/components/cam/cam.component.html`
- `software/frontend/src/app/services/reading.service.ts`

## Verification

- Run the Angular production build.
- Load the CAM page and request a date range that contains readings.
