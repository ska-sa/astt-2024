# ASTT-060: Independent three-point / triangle validation

**Status:** TODO — after reliable AZ/EL motion and rigid meter mounting
**Area:** Experimental validation
**Priority:** CRITICAL

## Goal and scope

Compare real-world relative pointing with the requested/reported mechanical
angles using the front laser distance meter and independently measured geometry.

- Define three separated target points, known baselines/separations/heights,
  reference axes and meter/dish origins before deriving expected AZ/EL angles.
  Ranges alone without sufficient geometry do not establish both angles.
- Account for fixture alignment/offsets under ASTT-095. Do not use firmware
  readings as the independent truth used to validate those same readings.
- Pair targets, raw encoders, reported angles, independent measurements and times.
- Repeat from both directions; record return-to-zero, error, repeatability,
  backlash/settling, interruptions and any needed mechanical calibration.
- Share evidence with ASTT-061–068/074 and the presentation. Sensor fitting is later.

## Decisions and exclusions

Agree geometry, laser-safe targets, uncertainty, tolerances, repetitions and
operator stop procedure first. Relative triangles do not qualify absolute north.
No automatic referencing, optical Sun tests or agent-powered movement.

## Acceptance criteria and verification

- [ ] Independent geometry and mounting alignment define reproducible expected angles.
- [ ] Paired results cover three points and both approach directions.
- [ ] Error/repeatability, limitations and required calibration actions are recorded.

Likely files: agreed procedure, measurement logs and analysis/plots. Review
calculations first; operator supervises physical measurements after motion works.
