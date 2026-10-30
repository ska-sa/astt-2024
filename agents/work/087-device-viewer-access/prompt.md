# ASTT-087: Let a device creator share read-only access

**Status:** Logged — depends on verified identity from ASTT-086
**Area:** Software and integration

## Context

The user wants a device's creator to choose who can see it. The telescope model
has no owner or membership list. Hidden UI controls alone cannot prevent
another user from calling an endpoint directly.

## Goal

A device owner can grant and revoke read-only access to selected people.

## In scope

- Assign ownership from the creator's verified server session.
- Let owners add/invite viewers and remove their access.
- Show viewers their shared devices, telemetry, history, and command history.
- Keep Point/Track, editing, deletion, and sharing management owner-only.
- Enforce permissions in backend operations as well as UI controls.
- Preserve existing devices/readings; explicitly assign legacy ownership
  rather than guessing owners or making old devices public.
- Keep telemetry/polling working through an agreed hardware credential policy,
  not an unrestricted bypass of device permissions.

## Out of scope

- Extra editor/operator roles, public links, ownership transfer, or a new identity provider.

## Decisions and questions

- Initial invited users are read-only; control permission is not included.
- Confirm email invitations versus existing-user selection, unregistered
  invitees, legacy ownership, and hardware authentication before implementation.
- Depends on ASTT-086; retain stable device IDs and stored history.

## Acceptance criteria

- [ ] Owner can add/remove a viewer; the viewer sees the shared device.
- [ ] Viewers cannot command/change/delete/re-share through UI or direct API calls.
- [ ] Unrelated users cannot enumerate/read another device or its nested records.
- [ ] Revocation applies on subsequent requests and legacy data stays intact.
- [ ] Hardware and owner/viewer/stranger permission tests pass.

## Likely files

- Backend telescope/user models, database migration, and route dependencies
- Telescope, reading, and command endpoints
- Frontend telescope list/details, CAM controls, services, and interfaces

## Verification

Use isolated accounts/devices to test an owner/viewer/stranger permission matrix
through both normal and direct endpoint requests.

Reference: [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
