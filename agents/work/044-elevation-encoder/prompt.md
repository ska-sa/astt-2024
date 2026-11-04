# ASTT-044: Read EL encoder and measure its protected travel

**Status:** IN PROGRESS — raw PWM reader added; operator test and stops pending
**Area:** Hardware | Integration
**Priority:** CRITICAL

## Context and goal

User confirms the EL encoder is now available. Read it reliably and record
both physical stop positions using the limit switches and encoder feedback.
Preserve working AZ wiring/control.

## Approved first step — 2026-10-30

Operator confirms restored master AZ works, and the EL encoder is the same
PWM type as AZ with its signal connected to GPIO35. Implement readings only,
using the same duty-cycle equation. Show raw `elEnc` and `EL_ENC` validity on
Serial and the existing API diagnostic log. No new motor feedback, zero or
limits yet. Wait for the operator's test/confirmation before any commit/push.

Follow-up: operator reports the UI elevation value does not change. The live
sample confirms `elEnc=36.92 EL_ENC=OK` but MPU `elevation_angle=0` and no typed
encoder field. Expose nullable `el_encoder_angle` throughout firmware/API/database
and all reading views, with legacy-log compatibility. Preserve motor feedback;
raw encoder degrees are not calibrated EL targets. Recover read polling after errors.

## In scope

- Confirm encoder model, signal/voltage, absolute versus incremental output,
  wiring, mounting, gearing and direction before assigning or enabling an input.
- Read/log raw values and detect invalid, missing, stale or implausible feedback.
- Confirm each limit switch's wiring, polarity, trip behavior and escape direction.
- Record minimum/maximum raw readings along the permitted travel, including wrap,
  plus measured stopping/clearance margins; enforce limits under ASTT-051.
- Supply measured values to ASTT-042/094 midpoint conversion and ASTT-055 control.

## Out of scope

Invented endpoints, automatic travel expansion/sweeps, using a reserved pin as
proof of a connected encoder, or gating progress on noisy MPU/magnetometer data.

## Decisions and questions

GPIO35 and the same PWM interface as AZ are now operator-confirmed. Exact model,
installed scale/gearing, direction and switch wiring still need recording before
EL movement. Raw PWM duty is not yet a calibrated dish angle; never assume boot
position is zero.

## Acceptance criteria

- [ ] Interface, wiring, direction and angular scale are confirmed.
- [ ] Fresh raw feedback and both stop/switch measurements are recorded.
- [ ] Faults, active switches, protected margins and E-stop have safe behavior.
- [ ] No unrelated AZ regression; physical results are recorded, not inferred.

## Likely files and verification

Integrated firmware, host tests, wiring and motor-calibration notes. Start with
unpowered/manual readings, then separately approved supervised stop checks.

## Approved temporary EL command range — 2026-11-03

Operator requests EL input from −130° to +130° to measure both physical
power-cutting limit-switch stops. Use the existing UI wrapping convention from
AZ and show matching signed EL readings/history; preserve API/firmware 0–360°,
full EL PWM, sensor readers and MPU levelling. Keep the existing offset until
raw stops and permitted direction/wrap are reported, then calculate a recorded
midpoint zero under ASTT-042/094. No automatic sweep or invented endpoints.
