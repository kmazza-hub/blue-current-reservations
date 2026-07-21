# Blue Current V22.0 — Cloud Foundation

## Run the complete cloud build

1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run:

   `npm start`

4. Open:

   `http://localhost:8787`

Do not open `client/index.html` directly when testing cloud persistence. The
Node server hosts the application, REST API, database service, and realtime
event stream together.

## Included

- Existing V21 Hospitality OS client
- Node.js HTTP application server
- File-backed durable JSON database
- Organization, location, user, configuration, feature flag, audit, reservation,
  and operational-event collections
- REST service layer
- Schema validation
- Server-sent events for real-time browser updates
- Cloud Console UI
- V21 browser-configuration migration control
- Persistent cloud reservation test
- No external dependencies

This is a local cloud foundation suitable for continued development and demos.
Production deployment will still require managed authentication, a transactional
database, encrypted secrets, tenant authorization policies, monitoring, and backups.
