# V82 Hotfix — Missing Performance Trend Service

This hotfix restores:

`server/services/pilotPerformanceTrendIntelligenceService.js`

The file was introduced in V81.75 and is required by the V82.x server dependency chain.

Apply the ZIP at the repository root, then run:

```powershell
node scripts/maintenance/test-hotfix-v82-missing-performance-trend-service.js
npm run start
```

No existing files are intentionally removed.
