BLUE CURRENT V34.3.1 — OFFLINE SYNCHRONIZATION & CONFLICT RESOLUTION

REPLACE
- client/index.html
- client/js/cloud/cloudApi.js
- client/js/modules/cloudFoundation.js
- client/js/modules/startupDiagnostics.js

ADD
- client/js/cloud/offlineSyncManager.js

IMPLEMENTED
- Durable local write queue for temporary cloud outages
- Automatic interception of queueable POST, PUT, PATCH, and DELETE requests
- Non-queueable protection for authentication and autonomous-cycle endpoints
- Organization and user context attached to queued writes
- Idempotency keys for safe replay
- Optimistic local-write events
- Automatic replay when connectivity and authentication return
- Sequential replay preserving operation order
- Retry-aware replay through the existing request pipeline
- 409 and 412 conflict detection
- Local-wins, server-wins, and manual-merge conflict strategies
- Version-aware replay with If-Match headers
- Queue discard controls
- Persistent synchronization and conflict history
- Domain-specific synced events
- Automatic bootstrap refresh after replay
- AppState synchronization status, queue depth, and conflict count
- Startup Diagnostics synchronization metrics
- Cloud Foundation status and conflict APIs

TEST
1. Replace/add the five files.
2. Run npm run check.
3. Run npm start.
4. Sign in and confirm normal writes still reach the cloud.
5. Stop the Node server or enable browser offline mode.
6. Create or update a reservation, table, workforce record, manager action, or configuration.
7. Confirm the response reports queued: true and the write appears in:
   BlueCurrentOfflineSync.snapshot()
8. Restore connectivity and confirm the queue replays automatically.
9. Confirm the bootstrap refreshes after replay.
10. Inspect synchronization metrics in Startup Diagnostics.
11. To test conflict handling, return HTTP 409 or 412 with a current/serverState payload for a queued write.
12. Resolve conflicts in the browser console with:
    BlueCurrentOfflineSync.resolveConflict(conflictId, "server-wins")
    BlueCurrentOfflineSync.resolveConflict(conflictId, "local-wins")
    BlueCurrentOfflineSync.resolveConflict(conflictId, "merge", mergedBody)
