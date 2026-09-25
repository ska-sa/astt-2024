# ASTT Agent Guide

## Project context

ASTT is a steerable antenna/telescope system that connects an Angular UI, a
FastAPI backend, and embedded hardware. The goal is safe, closed-loop azimuth
(AZ) and elevation (EL) control with readings returned to the user.

The two command paths are:

- **Point:** the user enters target AZ and EL values in the UI. The frontend posts
  a Point command, the backend stores it, and the hardware reads the latest
  command and moves toward those angles.
- **Track:** the user adds and selects a source in the UI. The frontend posts a
  Track command containing that source, the backend stores it, and the hardware
  reads the latest command and follows the calculated target.

The hardware posts telescope and sensor readings to the backend. The UI should
show the latest available readings and clearly distinguish requested targets from
measured positions. Keep frontend models, backend models, database fields, and
firmware payloads aligned whenever either command path changes.

## Start here

1. Read the root `README.md` and identify the requested `ASTT-NNN` work item.
2. Read `software/README.md`, `hardware/README.md`, or both for the affected area.
3. Check `git status` and preserve unrelated user changes.
4. Inspect the current implementation before proposing changes.

## Clarify before implementation

Ask a short question when the answer would change interfaces, hardware pins,
mechanical behaviour, stored data, repository structure, or safety. If a
requirement is unclear, ask the user before changing code. Do not guess
at missing wiring, calibration values, credentials, telescope IDs, or API hosts.

## Work-item workflow

For non-trivial work:

1. Use the matching `ASTT-NNN` ID from `README.md`. For genuinely new work, use
   the next unused number and add it to the root checklist.
2. Create `agents/work/NNN-short-title/prompt.md` from
   `agents/templates/prompt.md`.
3. Resolve open questions in the prompt and ask the user to approve it.
4. Implement the smallest change that satisfies the approved acceptance criteria.
5. Verify the change and record the result in `completion.md` in the same folder.
6. Update the root completed/total count only when the checklist state changes.

Small, obvious fixes may be implemented directly, but still require relevant
verification and a checklist update when they complete a tracked item.

## Engineering rules

- Keep changes simple, focused, and junior-friendly. Prefer clear names, small
  functions, and direct control flow over clever abstractions.
- Add Python type hints to function parameters and return values. Use explicit
  TypeScript types for public fields, request payloads, and method results.
- Add concise docstrings to Python modules, classes, and public functions. Add a
  short comment in TypeScript or firmware only when the reason is not obvious
  from the code. Do not add comments that only repeat the code.
- Preserve the existing Angular, FastAPI, SQLite, Arduino, and PlatformIO style.
- Keep frontend and backend request/response models aligned.
- Treat `hardware/wemos_lilon32/wemos_lilon32.ino` as the current integrated
  firmware unless the user selects another target.
- Never commit passwords, tokens, private network credentials, datasets, build
  outputs, virtual environments, or generated firmware binaries.
- Never flash a board, energize a motor, change pin assignments, or bypass an
  E-stop without explicit user approval.
- Use short smoke tests before hardware or full-system tests.
- Do not mark physical assembly, calibration, or qualification work complete
  based only on code inspection.
- Use concise one-line commit messages and group files by purpose when asked to commit.

## Definition of done

A work item is done only when its acceptance criteria pass, relevant documentation
is updated, and remaining hardware/manual checks are clearly reported.
