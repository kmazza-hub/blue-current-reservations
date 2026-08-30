# V100.2.85 — Network Connectivity Truth Foundation

Verifies `/api/health` at startup, browser reconnect, and operator retry. Browser `online` is no longer treated as proof that the Blue Current server is reachable. No polling loop or offline caching is added.

```powershell
node APPLY-V100.2.85.js
node scripts/maintenance/test-v100.2.85-network-connectivity-truth.js
```
