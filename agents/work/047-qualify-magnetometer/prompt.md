# ASTT-047: Later MPU/magnetometer reference fitting

**Status:** LATER — optional after reliable encoder motion, testing and presentation
**Area:** Hardware | Research | Calibration
**Priority:** Deferred; not today's blocker

## Context and goal

The current MPU/magnetometer readings are noisy. Preserve their implementation
for later experiments; use encoders and recorded mechanical zeros for movement.
When the phone holder/rigid mounting is ready, investigate whether calibrated
sensor readings can provide useful AZ/EL references.

## In scope (later)

- Record repeatable independent reference/encoder/sensor samples with mounting,
  orientation, units, timestamps and approach direction documented.
- Characterise noise, mounting offsets and interference before fitting a curve.
- Fit/validate on separate measured data; report errors and supported travel.
- Respect actual limits; a partial AZ sweep is not full XYZ calibration.
- Keep manual north alignment/base levelling and mechanical midpoint zeros distinct.

## Out of scope now

Re-enabling automatic north-finding, MPU-only EL control, startup calibration,
mandatory sensor gates or invented coefficients. No automatic motor sweep.

## Acceptance criteria (later)

- [ ] Rigid mounting and independent reference/measurement method are documented.
- [ ] Repeatability/noise and fit validation errors meet an agreed tolerance.
- [ ] Limits and encoder control remain protective; failure cannot drive unsafely.

## Likely files and verification

Research scripts, calibration records and a separately approved small integration.
No physical accuracy is claimed from model agreement or computer tests alone.
