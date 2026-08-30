# V100.2.86 — iPad Resume Truth Foundation

On foreground resume, Blue Current verifies server reachability and then allows the existing offline-sync manager to replay queued writes only when the server is verified connected.

No recurring polling, service worker, forced reload, or workspace reset is added.

```powershell
node APPLY-V100.2.86.js
node scripts/maintenance/test-v100.2.86-ipad-resume-truth.js
```
