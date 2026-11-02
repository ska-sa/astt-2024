# ASTT-099 completion

**Status:** Complete — software verified 2026-11-02; operator review pending

## Result

Manual Point accepts AZ −130° to +130° and EL 0° to 90°. Negative AZ converts
only at submission: −90° becomes API 270°. Gauge/Raw readings, CAM history,
Readings and Commands display the same signed AZ; the API objects, firmware
and encoder-limit checks are unchanged. The AZ scale now uses signed degree
labels. White-backed measured values remain outside the arcs at the needle tips.

Targets default to `(0, 0)` and initialize once from valid, in-range initial
readings. Early edits, later polling and tab switches preserve entered targets.
Removed the unused knob logic that reset the inputs on switching to Point.
Removed the requested hold, offset/range and reference helper paragraphs.
Serial diagnostics remain verbatim. Out-of-range actual telemetry is not clamped;
EL limits and physical references remain separate hardware work.

## Verification

- 63 focused ChromeHeadless CAM/Readings/Commands tests pass: signed endpoints,
  API conversion, invalid inputs, raw-limit checks, one-time initialization,
  unchanged hold payloads, polling, display/history consistency and missing feedback.
- Production build passes. Existing CanvasJS CommonJS and Bootstrap selector
  warnings remain. TypeScript app check passes.
- Isolated Chrome checks at desktop and 390 px mobile: gauge bounds at 0/±130°,
  wraparound, EL 0/90°, consistent toggles/gray arcs, no horizontal overflow or
  runtime exceptions. Initial API 275/45 becomes inputs −85/45; entered −90/35
  remains unchanged through polls and generates mocked API 270/35.
- All browser API calls were mocked; no live motor commands or service restarts.
  No firmware flash, backend edit or hardware-accuracy claim.

Commands from `software/frontend`:

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/components/cam/*.spec.ts' --include='src/app/components/readings/*.spec.ts' --include='src/app/components/commands/*.spec.ts' --progress=false
npm run build -- --configuration production --no-progress --output-path /tmp/astt-cam-gauge-build
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json
```

## Files

- `software/frontend/src/app/utils/angles.ts`
- `software/frontend/src/app/components/cam/cam.component.{ts,html,spec.ts}`
- `software/frontend/src/app/components/readings/readings.component.{ts,html,spec.ts}`
- `software/frontend/src/app/components/commands/commands.component.{ts,spec.ts}`
- `software/README.md`, root `README.md`, `agents/work/README.md`
- `agents/work/094-encoder-mechanical-coordinates/prompt.md`
- `agents/work/099-ui-signed-pointing/{prompt,completion}.md`

The earlier approved gauge patch was committed/pushed to master as `d41d2f9`.
This signed-angle patch is left uncommitted for review. ASTT-094 hardware/API
midpoint coordinates, EL limits and physical two-axis checks remain pending.
