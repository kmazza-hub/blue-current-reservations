# APPLY V64.50.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v64.50-workflow-reduction.js
node scripts/maintenance/test-v64.0-interaction-qa.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `64.50.0`

Browser verification:
1. Confirm the duplicate sticky Go to bar is gone.
2. Confirm the normal top navigation still works.
3. Open Quick Jobs.
4. Add walk-in opens Host / Waitlist and the walk-in workflow.
5. Add reservation opens Reservations and the reservation workflow.
6. Find guest opens Guest search and focuses search.
7. Solve staffing opens Workforce Intelligence.
8. Fix kitchen pressure opens Kitchen Throughput.
9. Run service opens Service Coordination.
10. Ask Blue Current opens AI Brain.
11. Leadership decision opens Executive.
12. Confirm no primary workflow was removed.

```powershell
git add -A
git commit -m "V64.50.0 reduce workflows and canonicalize operator jobs"
git push origin live-service-timeline
```
