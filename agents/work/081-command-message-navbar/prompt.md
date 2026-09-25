# ASTT-081: Improve command message and navbar

**Status:** Approved
**Area:** Software

## Context

Command confirmation is easy to miss, and the navigation disappears while the
user scrolls down the CAM page.

## Goal

Make command confirmation clearer and keep navigation visible while scrolling.

## In scope

- Show command success in a blue Bootstrap-style message.
- Keep the existing automatic dismissal.
- Keep the navbar at the top while the page scrolls.

## Out of scope

- Changing command API behaviour.
- Adding a shared notification service.

## Decisions and questions

- Keep this as a small component-level UI change.

## Acceptance criteria

- [x] A successful Point or Track command shows a blue confirmation message.
- [x] The message disappears automatically.
- [x] The navbar remains visible above scrolling page content.
- [x] The Angular production build passes.

## Likely files

- `software/frontend/src/app/components/cam/cam.component.html`
- `software/frontend/src/app/components/cam/cam.component.css`
- `software/frontend/src/app/components/navbar/navbar.component.html`
- `software/frontend/src/app/components/navbar/navbar.component.css`

## Verification

- Run the Angular production build.
- Manually send Point and Track commands and scroll the CAM page.
