# ASTT-083: Configure Docker LAN access through an environment file

**Status:** Complete
**Area:** Software

## Goal

Remove hardcoded frontend localhost addresses and allow the Docker services to
use the computer's LAN IP from a local environment file.

## Acceptance criteria

- [x] The local IP is stored in an ignored `software/.env` file.
- [x] A safe `software/.env.example` is tracked.
- [x] Docker publishes the frontend and backend on the configured IP.
- [x] Backend CORS allows the configured frontend origin.
- [x] Angular calls the API using the hostname that served the page.
- [x] The persistent database volume remains configured.

## Files

- `.gitignore`
- `software/.env.example`
- `software/docker-compose.yaml`
- `software/backend/main.py`
- `software/frontend/src/environments/environment.ts`
- `software/frontend/src/environments/environment.development.ts`
- `software/README.md`
