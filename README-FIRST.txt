BLUE CURRENT V34.4.0 — SERVER IDEMPOTENCY & VERSIONED SYNCHRONIZATION

REPLACE
- client/index.html
- client/js/cloud/cloudApi.js
- server/api/router.js
- server/server.js

ADD
- server/services/idempotencyService.js
- server/services/syncReconciliationService.js

IMPLEMENTED
- Server-side idempotency-key storage and replay
- Twenty-four-hour idempotency retention
- Duplicate in-progress operation protection
- Replayed-response headers
- Optimistic concurrency using If-Match or baseVersion
- HTTP 412 version-conflict responses
- Current server state returned with conflicts
- Per-organization, path, and entity resource versions
- Version increments after successful writes
- ETag and resource-version response headers
- Versioned-resource realtime events
- Synchronization reconciliation endpoint
- Server resource-version endpoint
- Audit reconciliation endpoint
- Synchronization audit records
- Expanded CORS support for idempotency and version headers
- Cloud API helpers for sync and audit reconciliation

TEST
1. Replace/add the six files.
2. Run npm run check.
3. Run npm start.
4. Sign in and make a write with X-Blue-Current-Idempotency-Key.
5. Repeat the same request and confirm the original response is replayed with:
   X-Blue-Current-Idempotency-Replayed: true
6. Make a versioned write using If-Match.
7. Repeat with an outdated version and confirm HTTP 412 with current server state.
8. Inspect:
   GET /api/sync/versions
9. Reconcile client versions with:
   POST /api/sync/reconcile
10. Reconcile audit records with:
    POST /api/audit/reconcile
