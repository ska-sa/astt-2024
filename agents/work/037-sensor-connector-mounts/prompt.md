# ASTT-037: Phone holder on the AZ gear

**Status:** IN PROGRESS — mechanical design with teammates
**Area:** Hardware | Mechanical
**Priority:** HIGH — parallel fixture work; sensor fitting is later

## Context and goal

Mount a phone reproducibly on the AZ gear to compare independent observations
with encoder/MPU/magnetometer readings during later calibration experiments.
The noisy sensors are not required for today's encoder-based movement.

## In scope

- Confirm phone size, gear attachment, orientation marks and camera/screen access.
- Provide secure retention, repeatable alignment and full-travel/cable clearance.
- Record phone-to-dish alignment and how comparison readings will be captured.
- Check whether the installed phone/fasteners change sensor readings before
  treating those readings as an independent calibration reference.
- Coordinate sensor/connector supports and printing under ASTT-036/038/039.

## Out of scope

Curve fitting, automatic north-finding, changed travel limits or unapproved
powered tests. A phone reading alone does not establish pointing accuracy.

## Decisions and questions

User reports this holder work is ongoing. Confirm dimensions and attachment
method with teammates; do not guess the phone model or sensor alignment.

## Acceptance criteria

- [ ] Phone is secure, removable and repeatably aligned to the AZ assembly.
- [ ] Approved travel does not cause contact, slipping or cable strain.
- [ ] Alignment/comparison procedure is recorded for later ASTT-047 work.

## Likely files and verification

Agreed holder CAD/print files and mounting notes. Unpowered fit checks first;
operator-approved retention/clearance checks before collecting comparison data.
