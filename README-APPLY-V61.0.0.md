# APPLY V61.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v61.0-navigation-live-contrast.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `61.0.0`

Browser verification:
1. Command works.
2. Live works.
3. Floor scrolls to Host Stand.
4. Reservations scrolls to the guest/reservation journey.
5. Staff scrolls to Workforce Foundation.
6. Kitchen reveals and scrolls to Kitchen Throughput.
7. Executive scrolls to Executive Command Center.
8. AI Brain reveals and scrolls to the Restaurant AI Brain.
9. All numbers and copy inside dark Live cards are bright and readable.
10. Search inputs remain white with dark readable text.

```powershell
git add -A
git commit -m "V61.0.0 fix navigation and live contrast"
git push origin live-service-timeline
```
