# ASTT-080: Combine hardware and software repositories

**Status:** Approved
**Area:** Integration and documentation

## Context

Hardware and software were maintained in separate repositories, which made
cross-system changes and agent-assisted work harder to coordinate.

## Goal

Create one simple repository containing hardware, software, shared context, and
a numbered prompt workflow.

## In scope

- Move existing application files under `software/`.
- Copy tracked hardware files under `hardware/` without nested Git metadata.
- Create a concise grouped checklist with stable work-item numbers.
- Add subsystem READMEs, `AGENTS.md`, and a reusable prompt template.

## Out of scope

- Merge the hardware repository's Git history.
- Rename the GitHub remote.
- Change firmware behaviour or application features.

## Decisions and questions

- Keep the software repository history as the monorepo history.
- Copy only tracked hardware files.
- Use `ASTT-NNN` identifiers across checklists and prompt records.

## Acceptance criteria

- [x] Hardware and software are available in separate root subdirectories.
- [x] Root documentation links both subsystems and tracks completed work.
- [x] Agents have clear rules and a prompt template.
- [x] Angular build and Docker Compose checks pass from their new paths.
- [x] Copied hardware files pass the credential scan.
- [ ] Compile the active firmware when Arduino CLI or PlatformIO is available.

## Likely files

- `README.md`
- `AGENTS.md`
- `software/`
- `hardware/`
- `agents/`

## Verification

- Run the Angular production build.
- Validate Docker Compose configuration.
- Compile the active firmware when the required PlatformIO toolchain is available.
