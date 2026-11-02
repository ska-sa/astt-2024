# ASTT-099: Signed AZ input and consistent UI angles

**Status:** Complete — software verified 2026-11-02; operator review pending
**Area:** Software

## Goal and approved scope

User requested on 2026-11-02 after approving/pushing ASTT-097/098: keep this
change in the frontend. Accept AZ -130° to +130° and EL 0° to 90°, show signed
AZ consistently, initialise inputs once from the first loaded readings (0/0
fallback), and remove the requested reference/hold explanatory text.

## Decisions

- API/firmware continue using wrapped 0–360° angles. UI -90° sends API 270°;
  API 275° displays -85°. This is a representation change, not a new reference.
- Existing metadata/raw-limit validation, hold behavior and Track payload stay.
- Input edits and later polling must not reset targets. Invalid/out-of-input-range
  initial values leave 0 defaults; actual readings are never clamped or fabricated.
- CAM gauges/raw view/history, Readings and Commands use the same signed AZ conversion.
- Axis scales show AZ -130..+130 and EL 0..90. Sensor diagnostics stay verbatim.
- Hardware and API midpoint-coordinate work remains ASTT-094, including EL limits.

## Acceptance criteria

- [x] Negative and endpoint AZ Point inputs convert to the equivalent API targets.
- [x] AZ outside -130..130 and EL outside 0..90 are rejected without submission.
- [x] Gauge/value/history/table AZ agrees; API objects and hold payloads stay unchanged.
- [x] Initial readings seed targets once; edits, polling and Point/Track switching preserve them.
- [x] Requested filler is removed; tests, build and isolated UI checks pass.

## Out of scope

Backend or firmware edits, absolute calibration, live motor tests, changes to Track
math, and automatic commit/push of this new patch before review.
