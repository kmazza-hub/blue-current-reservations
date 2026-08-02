BLUE CURRENT V34.5.0 — PRODUCTION OBSERVABILITY & INCIDENT COMMAND

REPLACE
- server/api/router.js
- server/server.js
- client/index.html
- client/styles.css
- client/js/cloud/cloudApi.js
- client/js/modules/startupDiagnostics.js

ADD
- server/services/telemetryService.js
- client/js/modules/observabilityIncidentCommand.js

IMPLEMENTED
- Server-side request telemetry
- Request counts, success rates, client errors, server errors, authentication failures, conflicts, and idempotency replays
- Average, P50, P95, and P99 latency metrics
- Server uptime and realtime-client tracking
- Storage-volume telemetry
- Automatic realtime signals for server errors and slow requests
- Persistent incident records
- Incident severity, ownership, status, description, and timeline
- Incident create, acknowledge, resolve, and update APIs
- Production Observability & Incident Command interface
- Live platform-health score
- Request-activity browser
- Infrastructure and storage state
- Incident declaration and response controls
- Automatic 30-second telemetry refresh
- Audit records for incident creation and updates

TEST
1. Replace/add the eight files.
2. Run npm run check.
3. Run npm start.
4. Sign in and open Observability & Incident Command.
5. Generate API activity and confirm requests, success rate, and latency update.
6. Create a warning and critical incident.
7. Acknowledge and resolve each incident.
8. Confirm incident changes persist after refresh.
9. Trigger a failed or slow request and confirm a realtime observability signal is generated.
10. Inspect GET /api/observability/snapshot.
