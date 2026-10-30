# ASTT-086: Sign in with a single-use code instead of a password

**Status:** Logged — confirm delivery/session choices before implementation
**Area:** Software

## Context

The user wants to request a token, receive it, and enter it in the app to sign
in. Current login checks email/password and returns a user object; there is no
server-verified session. This must establish identity, not just hide the input.
Keycloak remains a separate optional task under ASTT-011.

## Goal

Enter email, request a code, paste the received code, then use a verified session.

## In scope

- Replace password entry with request-code and verify-code steps.
- Use unpredictable, expiring, single-use codes with request/attempt limits.
- Avoid exposing account existence, codes, passwords, or session secrets in
  public responses or logs. Stop returning passwords in user responses.
- Issue and verify a separate session token after successful verification;
  the received code is not a reusable API token. Invalidate sessions on logout.
- Derive the signed-in user on the server, not from a client-supplied user ID.
- Preserve accounts and keep delivery credentials out of Git.
- Agree separate hardware authentication so telemetry/polling is not broken.

## Out of scope

- Adding Keycloak simultaneously, sharing devices, or changing firmware Wi-Fi credentials.

## Decisions and questions

- Assumption to confirm: delivery is by email, not SMS or an authenticator app.
- Confirm provider, registration policy, code/session lifetimes, session storage,
  and TLS deployment before implementation. Do not invent credentials.
- Coordinate endpoint protection with ASTT-087 and hardware credential policy.

## Acceptance criteria

- [ ] A valid code signs in; wrong, expired, reused, and excessive attempts fail.
- [ ] Server session checks protect user operations; forged user IDs do not authenticate.
- [ ] Logout/expiry invalidate sessions; responses expose no passwords or codes.
- [ ] Existing users survive; tests use fake delivery, not real messages.
- [ ] Frontend/backend tests and documentation are updated.

## Likely files

- Backend user model, database, user endpoints, and route authentication
- Frontend sign-in/sign-up, user services/interfaces, user guard, and `signal.ts`

## Verification

Use isolated storage and fake delivery to test code/session lifecycles and
direct unauthenticated requests. Do not send real login messages during tests.

Reference: [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
