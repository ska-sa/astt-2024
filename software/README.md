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
cp software/.env.example software/.env
# Set HOST_IP in software/.env to this computer's LAN IP.
docker compose -f software/docker-compose.yaml up --build
```

The frontend is served on `http://<HOST_IP>:4200` and the API on
`http://<HOST_IP>:8000`. The frontend automatically rebuilds and refreshes when
files under `software/frontend` change. Rebuild the container when dependencies
in `package.json` change. Docker stores SQLite data in the persistent
`backend-databases` volume.

The backend source is copied into its image; it is not mounted from the host.
After backend changes, rebuild/recreate that service so the running API uses
the new model and migration:

```bash
docker compose -f software/docker-compose.yaml up -d --build astt-software-backend-service
```

The `serial_log` migration adds a nullable SQLite column without replacing old
records. Keep the named database volume during updates; do not use `down -v`.

On 2026-10-22, another project's auto-scheduler occupied ports `8000`/`4200`,
and requests reached that application instead of ASTT. With user approval, only
that project's frontend/backend containers were stopped and ASTT was rebuilt/
started on its existing ports. Mongo services and volumes were retained; no
Compose, environment, or port changes were needed. If this recurs, inspect which
containers own the ports before changing configuration or stopping anything.
After the approved switch, the frontend and existing reading/command routes
returned HTTP 200 with the persistent database retained. Old rows correctly
return `serial_log: null`; new diagnostic lines require updated firmware readings.

## Current API flow

- Hardware posts telemetry to `POST /api/v1/readings`.
- The CAM page reads `GET /api/v1/readings/{telescope_id}/latest`.
- The frontend posts nested Point or Track commands to `POST /api/v1/commands`.
- Hardware polls `GET /api/v1/commands/{telescope_id}/latest`.
- Updated firmware GETs/PUTs its existing telescope record asynchronously to publish AZ
  limits in JSON `metadata`. CAM loads the same metadata and rejects invalid
  Point targets with an inline error; the backend validates configured limits too.

ASTT-085 established encoder-only Point tests with a zero offset. Its raw AZ
range runs from `137.8°` through `360°/0°` to the assumed `37.8°` opposite stop.
In that encoder-only frame, `250°`, `350°`, and `20°` are allowed and `100°` is
rejected. The user confirmed tests at `20°`, `30°`, and `200°` without
limit-switch strikes. The operator now confirms both stops and clockwise 1:1
encoder mapping. These
raw test angles must be shifted by the displayed offset when testing north-based
Point commands; use the UI's current allowed range.

ASTT-043 uses `USE_MANUAL_AZ_REFERENCE = true` with recorded
`encoderAtNorth = 267.8°`, the midpoint along the verified 260° raw arc.
The fixed offset is `92.2°`; AZ is `norm360(raw encoder + offset)`.
The operator manually levels and north-aligns the base at that midpoint before
sending a fresh command. There are no new alignment/calibration buttons, login
requirements or Serial interaction commands. Firmware cannot verify alignment
or detect later base repositioning: stop, realign and send a new command after
moving the base. No startup movement or old-command replay occurs.

Compass initialization/retry and continuous field reads are reused from the
working standalone sketch on the same shared I2C bus. Magnetic readings remain
visible in the app, Serial and Show more but never change the manual reference.
Full magnetic calibration/automatic referencing stays deferred under ASTT-047.

Declination is calculated on the MCU for `2026 <= decimal UTC year < 2028`;
invalid/unsupported dates return `NAN` rather than a fallback. This affects
diagnostic true heading, not manual Point. Celestial Track keeps its real-UTC
requirement. Firmware enforces encoder availability. Existing telescope metadata
publication is best effort, not permission for local motor movement. CAM
refreshes numeric limits/offset on new readings and before commands without
starting motion. Old readiness/calibration flags do not block Point. Manual UI
shows `MANUAL_ALIGNMENT` without compass-calibration/date errors;
frontend/backend keep the numeric raw-arc checks. True `0°/360°`
is rejected if subtracting the offset places it inside the blocked raw arc.

### Remote reading diagnostics

Each reading may contain `serial_log: string | null` through existing reading
POST/PUT, latest, list, and range routes. The field is optional and limited to
2048 characters; old payloads and rows return null. Firmware creates a bounded
1024-byte snapshot, prints it roughly once per second, and posts it every five
seconds alongside the sensor values. CAM's live panel, sampled history, and the
readings list expose escaped text under **Show more**; it is never rendered as HTML.

The line records angles, targets, requested PWM, sensor availability and values,
command events, site source, and previous HTTP results. Manual health is FAULT for
E-stop, missing AZ encoder feedback or network-worker failure; DEGRADED for
missing magnetic/date diagnostics, MPUs or GPS fix,
and otherwise OK; none of these states qualifies heading accuracy. E-stop
continues posting readings/logs with motor outputs off and command polling paused.

The firmware posts encoder-derived manual `azimuth_angle`, so live readings and history
display it directly, without adding the current offset again. Old readings
retain the reference they used at the time. Magnetic fields remain Tesla in the
API and are displayed as `µT`.
Encoder feedback controls motor error/stopping and mechanical limits. The manual
offset stays fixed between commands as well as during them. Invalid compass
samples mark diagnostic heading stale, without replacing AZ or blocking manual Point.

The Telescopes/device table polls each device's existing latest-reading route
with overlap guards and stops polling when the page is destroyed. It shows that
reading's health and **Last seen**, not the telescope record's initial OK value.
Missing, failed, future or older-than-10-second readings gray out the row; no
Online/Offline label is added. These read-only updates never issue commands.

HTTP now runs in an ESP32 worker with copied snapshots so its 2 s/5 s requests
do not intentionally interrupt motor PWM. Command IDs, E-stop, encoder limits
and the 10 s communication timeout remain authoritative; stale replies cannot
resume stopped commands. AZ minimum PWM is 210 (was 140), maximum 255. Physical
smoothness and stopping still need supervised testing after operator upload.
After flashing/rebooting, manually prepare alignment, then submit a new command:
the firmware deliberately ignores commands saved before startup. The existing
UI popup confirms command submission, not arrival. Firmware `AZ POINT COMPLETE`
latches the AZ stop only; repeated command IDs cannot restart it after base
movement. A new command is required after completion, communication timeout, or
E-stop. The EL draft is unchanged and physically unqualified. `ON TARGET` still
requires valid AZ and EL feedback; the extra arrival popup remains deferred.

### Software hold (ASTT-084)

The red **Stop / hold position** button beside Point and Track fetches the latest
reading and posts a Point command with those reported AZ/EL values unchanged.
It needs a signed-in user, numeric AZ limits/offset, and fresh online readings within
the allowed range. Invalid/faulted readings and overlapping submissions are
rejected; pending hold requests are cancelled when leaving CAM.

This is not an emergency stop or motor-power cut. Telemetry and command polling
introduce delay, and the telescope may move back toward an older reported
position. The popup confirms submission only. Use the physical E-stop for
emergencies; its qualification remains ASTT-051. No new API endpoint is added.

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
| ASTT-084 | Done | Red software hold button sends latest measured AZ/EL as a Point command; mocked frontend checks pass, physical behaviour still needs operator verification. |
| ASTT-085 | Point tests passed; final calibration pending | Encoder-only AZ reference, shared JSON limits, and Point range validation. |
| ASTT-043 | Manual reference implemented; independent accuracy pending | Fixed midpoint north, unchanged raw limits, encoder-derived AZ and separate magnetic diagnostics; no new controls. |
| ASTT-092 | Software verified | Optional reading diagnostics, preserved legacy rows, actual sensor health, and escaped Show more in reading views. |
| ASTT-093 | Software verified; powered checks pending | HTTP worker keeps feedback active during requests, minimum AZ PWM is 210, and device rows use latest-reading health/freshness. |

Physical elevation under ASTT-055 is reopened, not complete. Its feedback and
mounting clarification remain planning work separate from the verified AZ change.

## Software verification

```bash
cd software/frontend
npm ci --legacy-peer-deps
npm run build -- --configuration production --no-progress
```

```bash
docker compose -f software/docker-compose.yaml config
```
