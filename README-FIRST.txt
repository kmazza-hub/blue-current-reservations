BLUE CURRENT V34.5.1 — SLO ALERTING & AUTOMATED RUNBOOKS

REPLACE
- server/api/router.js
- server/server.js
- client/index.html
- client/styles.css
- client/js/cloud/cloudApi.js
- client/js/modules/startupDiagnostics.js

ADD
- server/services/reliabilityAutomationService.js
- client/js/modules/reliabilitySloRunbooks.js

IMPLEMENTED
- Service-level objectives for API availability, P95 latency, server errors, critical incidents, and synchronization conflicts
- Warning and breach threshold evaluation
- Reliability score and error-budget calculation
- Realtime SLO evaluation and breach events
- Persistent SLO configuration support
- Controlled automated runbooks
- Telemetry refresh, client-cache invalidation, incident declaration, critical-incident declaration, and incident acknowledgment actions
- Persistent runbook execution history
- Audit records for SLO configuration and runbook execution
- New SLO Alerting & Automated Runbooks interface
- Objective status cards
- Error-budget and breach visibility
- Runbook steps and safe-action controls
- Automatic 60-second reevaluation
- Responsive desktop, tablet, and mobile layouts

TEST
1. Replace/add the eight files.
2. Run npm run check.
3. Run npm start.
4. Sign in and open SLO Alerting & Automated Runbooks.
5. Generate normal and failed API requests and click Evaluate Now.
6. Confirm warning and breach states update.
7. Execute Refresh Telemetry and Declare Incident runbook actions.
8. Create a critical incident and test Acknowledge Critical Incidents.
9. Confirm runbook history persists after refresh.
10. Inspect GET /api/reliability/slo and GET /api/reliability/history.
