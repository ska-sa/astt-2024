# ASTT-084: Add a software hold-position button

**Status:** Complete — software verified; physical behaviour awaits operator testing
**Area:** Software

## Context

CAM already posts Point and Track commands. The user requested a simple red
control that replaces the active target with the latest reported AZ and EL.

## Goal

Add a red Stop / hold position button beside Point and Track in the control panel.

## In scope

- Reuse the latest-reading GET and Point-command POST; no new endpoints.
- Fetch the latest reading on click and preserve its reported AZ/EL in the payload.
- Require fresh, valid, in-range readings for the current telescope and user.
- Prevent overlapping submissions and show submission success or failure.
- Explain the latency and that a software hold is not a physical E-stop.

## Out of scope

- Firmware/backend changes, motor-power isolation, physical E-stop qualification,
  new north/alignment UI fields, or automatic arrival confirmation.

## Decisions and questions

- The requested Point-command workaround is approved for this ticket.
- Readings may be several seconds old: the command can move back toward an
  earlier reported position. Success means submitted, not stopped.
- Existing encoder limits and offset remain authoritative for range validation;
  do not apply the offset a second time to the reported target angles.

## Acceptance criteria

- [x] The red hold control shares the Point/Track action row, spaced apart; top-right mode navigation remains separate.
- [x] The command uses newly fetched measured angles, not editable target inputs.
- [x] Stale, invalid, faulted, out-of-range, or wrong-device readings are rejected.
- [x] Pending requests prevent duplicate or conflicting submissions.
- [x] Request errors are visible; only success changes the target inputs.
- [x] Focused frontend tests and production build pass; documentation is updated.

## Likely files

- `software/frontend/src/app/components/cam/cam.component.ts`
- `software/frontend/src/app/components/cam/cam.component.html`
- `software/frontend/src/app/components/cam/cam.component.spec.ts`
- Root/software README and this work record

## Verification

Run focused CAM tests with mocked services and the Angular production build.
Do not send real motor commands or flash hardware during software verification.
Physical latency and stopping behaviour remain bench checks under ASTT-051.
