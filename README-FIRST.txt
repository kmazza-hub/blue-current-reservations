BLUE CURRENT V34.3.2 — DURABLE AUDIT & RECONCILIATION LEDGER

REPLACE
- client/index.html
- client/js/cloud/cloudApi.js
- client/js/modules/cloudFoundation.js
- client/js/modules/startupDiagnostics.js

ADD
- client/js/cloud/auditReconciliationLedger.js

IMPLEMENTED
- Durable local audit ledger
- Hash-chained, sequence-validated audit records
- Automatic sensitive-field redaction
- Authentication, API, offline sync, bootstrap, configuration, reservation, and governance event capture
- Successful cloud-write auditing
- Organization, user, role, domain, source, severity, and timestamp attribution
- Full ledger integrity verification
- Cloud audit-log import
- Local-to-cloud audit reconciliation
- Missing-local and pending-cloud discrepancy detection
- Audit checkpoint status and head hashes
- AppState audit integrity and reconciliation status
- Cloud Foundation verify, reconcile, export, and download APIs
- Filterable audit querying
- Downloadable JSON audit packages
- Persistent audit export and reconciliation history
- Startup Diagnostics audit metrics
- Integrity-failure events and operating status warnings

TEST
1. Replace/add the five files.
2. Run npm run check.
3. Run npm start.
4. Sign in and perform several writes, offline replays, configuration updates, and reservation actions.
5. Inspect:
   BlueCurrentAuditLedger.snapshot()
6. Verify the chain:
   BlueCurrentAuditLedger.verify()
7. Export an audit package:
   BlueCurrentAuditLedger.exportPackage()
8. Download an audit package:
   BlueCurrentAuditLedger.download()
9. Refresh and confirm the ledger remains durable.
10. Confirm cloud audit logs are imported during bootstrap and reconciliation status appears in Startup Diagnostics.
11. For a controlled integrity test, modify one stored audit entry in localStorage and run verify(); confirm the failure is detected.
