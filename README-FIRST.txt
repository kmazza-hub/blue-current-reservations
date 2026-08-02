BLUE CURRENT V34.4.1 — SYNCHRONIZATION CONTROL & RECOVERY CENTER

REPLACE
- client/index.html
- client/styles.css
- client/js/cloud/cloudApi.js
- client/js/modules/startupDiagnostics.js

ADD
- client/js/modules/syncControlCenter.js

IMPLEMENTED
- Visible synchronization health score
- Online/offline state
- Offline queue depth and queued-write inspection
- Manual queued-write replay
- Individual queued-write discard controls
- Open-conflict inspection
- Server-wins and local-wins conflict actions
- Server resource-version browser
- Manual client/server version reconciliation
- Version-drift scoring
- Local audit-ledger integrity verification
- Cloud audit reconciliation
- Downloadable audit package action
- Recovery and reconciliation history
- Live AppState/event-driven updates
- Responsive desktop, tablet, and mobile layouts
- Cloud API unified synchronization snapshot helper

TEST
1. Replace/add the five files.
2. Run npm run check.
3. Run npm start.
4. Sign in and open Synchronization Control & Recovery Center.
5. Click Refresh and Reconcile.
6. Enter browser offline mode and create a queueable write.
7. Confirm it appears in the queue.
8. Restore connectivity and click Replay Queue.
9. Create a version conflict and test Keep Server and Keep Local.
10. Verify and reconcile the audit ledger, then download an audit package.
