# ASTT Software

The software subsystem contains the Angular frontend, FastAPI backend, SQLite
database layer, Docker Compose setup, and design diagrams.

## Structure

```text
software/
├── backend/
├── frontend/
├── design/
└── docker-compose.yaml
```

## Run with Docker

From the repository root:

```bash
docker compose -f software/docker-compose.yaml up --build
```

The frontend is served on `http://localhost:4200` and the API on
`http://localhost:8000`. The frontend automatically rebuilds and refreshes when
files under `software/frontend` change. Rebuild the container when dependencies
in `package.json` change.

## Current API flow

- Hardware posts telemetry to `POST /api/v1/readings`.
- The CAM page reads `GET /api/v1/readings/{telescope_id}/latest`.
- The frontend posts nested Point or Track commands to `POST /api/v1/commands`.
- Hardware polls `GET /api/v1/commands/{telescope_id}/latest`.

## Software work items

| ID | Status | Detail |
|---|---|---|
| ASTT-001 | Done | SQLite creates the telescope, reading, command, source, and user tables. Legacy command and source schemas migrate on startup. |
| ASTT-002 | Done | FastAPI exposes CRUD operations for the main entities. |
| ASTT-003 | Done | Hardware can retrieve the latest command for one telescope. |
| ASTT-004 | Done | Readings can be queried for a telescope and date range. |
| ASTT-005 | Done | Commands use `point` or `track` payloads matching the backend models. |
| ASTT-006 | Done | The CAM controls can submit Point and Track commands. |
| ASTT-007 | Done | The CAM page polls and displays the latest sensor reading. |
| ASTT-008 | Done | Users can create, update, select, and delete tracking sources. |
| ASTT-009 | Done | Command history displays Point angles or a Track source. |
| ASTT-010 | Done | Plot measured azimuth and elevation with date filtering and selectable sampling. |
| ASTT-011 | Todo | Add Keycloak only after the physical Point/Track loop is stable. |
| ASTT-081 | Done | Show a blue command confirmation and keep the navbar visible while scrolling. |

## Software verification

```bash
cd software/frontend
npm ci --legacy-peer-deps
npm run build -- --configuration production --no-progress
```

```bash
docker compose -f software/docker-compose.yaml config
```
