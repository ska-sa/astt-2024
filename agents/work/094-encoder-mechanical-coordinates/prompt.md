# ASTT-094: Signed midpoint zeros and reliable AZ + EL Point movement

**Status:** TODAY — planned, not implemented
**Area:** Hardware | Integration
**Priority:** CRITICAL

## Next phase — signed AZ input (requested 2026-11-02)

After the current gauge UI review, implement AZ angles from **-130° to +130°**,
including negative user inputs. Start with AZ; EL midpoint work still awaits its
recorded stops. Preserve the raw AZ endpoints and recorded midpoint, and update
command validation, target conversion, readings and graph labels consistently.
This is queued work; the current UI refinement does not change coordinates.

- [ ] Accept reachable negative AZ targets, including values close to both ends.
- [ ] Keep encoder limits and safe-path checks in the original raw frame.
- [ ] Show signed measured AZ consistently in gauges, tables and history.
- [ ] Verify midpoint/endpoint conversions and existing timeout/E-stop behavior.

## Goal and implementation order

Reliable encoder-feedback movement, not automatic north-finding or absolute accuracy.

1. Preserve operator-confirmed AZ limits, pins and routing, and basic EL Point
   movement accepted under ASTT-055 on 2026-10-30.
2. ASTT-044/051: verify limit switches and record both EL stops, sign/scale and
   stopping margins before enabling signed midpoint control and software limits.
3. Calculate/store each midpoint along the permitted encoder path, including wrap.
   Convert encoder position to signed mechanical angles and targets back to raw
   values along that same path. Always enforce raw limits and safety margins.
4. Update the minimum related firmware/API/UI validation, metadata, telemetry
   and graph contract together; negative reachable targets must be accepted.
5. Test each axis separately, then together: reach a safe (AZ, EL), stop correctly
   and return repeatably to mechanical (0, 0). Preserve faults/E-stop/no-replay.

## Coordinate contract and decisions

- Zero is the recorded midpoint, never the position occupied at power-on.
- AZ: 137.8° through 360/0° to 37.8°; span 260°, midpoint 267.8°; nominal signed
  range -130° to +130° before margins. Old wrapped 275° corresponds to -85°.
- EL stops/scale are unmeasured. A 90° span would be roughly ±45°, not 0–90°;
  this is an example, not an assumed physical range.
- Confirm encoder interface/gearing and position retention after restart. Unknown
  position cannot be declared zero; any required homing must be separately supervised.
- Manual north alignment/base levelling are separate references. EL midpoint
  need not be horizontal; future absolute angles require a measured alignment offset.
- Preserve sensor code but do not require noisy MPU/magnetometer data for Point.
  Leave source calculations unchanged; do not silently feed celestial angles into
  signed mechanical mode. Celestial Track is not today's acceptance criterion.

## Out of scope

Automatic referencing/calibration, invented coefficients, travel expansion,
unrelated rewrites, agent flashing or powered tests.

## Acceptance criteria and verification

- [ ] Encoder/switch endpoints, direction/scale and safe margins are recorded.
- [ ] Wrapped midpoint/inverse conversions and signed command/UI ranges agree.
- [ ] Separate axes pass before combined moves and return to (0, 0).
- [ ] Limits, feedback loss, timeout, E-stop and no automatic resume are verified.
- [ ] Operator measurements/limitations are recorded; no code-only accuracy claim.

Likely files: integrated .ino, focused tests and minimum related command/UI handling.
Use synthetic wrapping/sign/fault checks first, then approved supervised bench tests.
This planning update makes no application-code change.
