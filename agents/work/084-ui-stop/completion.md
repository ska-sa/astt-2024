# ASTT-084 completion notes

**Status:** Complete — frontend verified 2026-10-19; hardware not exercised

## Implemented

- Added a red Stop / hold position button. On 2026-10-20 it moved to the shared
  Point/Track action row, spaced apart with a stop icon; top-right mode navigation remains separate.
- Reused the latest-reading GET and Point POST without backend/firmware changes.
- Preserved exact measured AZ/EL in the command; no extra offset or clamping.
- Required current-device, online readings at most 10 seconds old, valid angles,
  safe reported status, calibration/range validation, and a signed-in user.
- Blocked concurrent submissions, rejected invalid fetched snapshots, surfaced
  errors, and updated Point inputs only after a successful POST.
- Cancelled pending hold requests on component destruction; checked user/device
  scope before sending and before updating the current page after success.
- Kept the existing brief blue confirmation: Hold-position command sent.

## Verification

From `software/frontend`:

```bash
npm run build -- --configuration production --no-progress
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/components/cam/cam.component.spec.ts --progress=false
```

- Production build passed; existing CanvasJS CommonJS/Bootstrap selector warnings remain.
- All 25 focused CAM tests passed on 2026-10-20, including layout in both modes,
  exact snapshot payloads, stale/invalid
  data, configured limits, request failures, concurrent requests, and user/device/
  component-lifecycle races.
- `git diff --check` passed. No real API commands were sent or hardware flashed.

## Remaining operator checks

Check the rendered button in both modes and confirm the workaround on the bench
with a safe setup. Telemetry is periodic and commands are polled: the hold can
be delayed and can move back toward an older position. Success confirms backend
submission, not a physical stop. It cannot cut motor power or replace the
physical E-stop; ASTT-051 remains incomplete. No commit or push was requested.
