# ASTT-083 completion

**Status:** Complete

## Result

- Configured local Docker access with `HOST_IP=172.22.9.54` in the ignored
  `software/.env` file.
- Removed hardcoded `localhost` values from the Angular API configuration and
  backend CORS configuration.
- Kept the SQLite named volume unchanged.

## Verification

- Angular production build passed.
- Frontend returned HTTP 200 at `http://172.22.9.54:4200`.
- Backend returned HTTP 200 at `http://172.22.9.54:8000`.
- CORS preflight allowed `http://172.22.9.54:4200`.
- The persistent database still contained the existing users after rebuild.
