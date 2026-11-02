# ASTT-097 completion

**Status:** Complete — software verified 2026-11-02

## Implemented

Simple is the default. The Bootstrap Simple/Raw toggle uses the same button size as Point/Track and changes presentation only. Raw retains all existing sensor groups and escaped diagnostics; live polling, online freshness, health, command modes/targets and graph controls are preserved.

Header refinement on 2026-11-02: title left, a single centered group for
health/movement, online/offline on its own line, and last-active time, with the view toggle at the
far right. Both views share that header without duplicate health fields. On
small screens the status group wraps below while the toggle stays top-right.
The production build, 57 existing tests and desktop/mobile browser checks pass.

## Verification

- 57 focused CAM/Readings tests pass in ChromeHeadless, including live updates,
  switching without commands, referenced values, invalid/missing feedback,
  wraparound and an allowed arc that stays fixed as AZ moves.
- Production build passes with the existing CanvasJS CommonJS and Bootstrap
  selector warnings.
- Isolated Chrome checks at 1440px and 390px used mocked readings: both views,
  live changes from 30°/45° to 90°/90°, no page overflow or runtime exceptions.
  All API calls were intercepted; zero command POSTs, no hardware tests.
- `git diff --check` passes. No new dependencies, firmware/backend changes,
  service restarts, commit or push.

Commands from `software/frontend`:

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/components/cam/*.spec.ts' --include='src/app/components/readings/*.spec.ts' --progress=false
npm run build -- --configuration production --no-progress --output-path /tmp/astt-cam-gauge-build
```

## Remaining

Operator visual acceptance with real readings. EL range measurement/protection
and coordinate/reference qualification retain their existing tasks. These UI
checks establish no physical pointing accuracy.
