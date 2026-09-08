# APPLY V65.50.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v65.50-rush-hour-speed.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `65.50.0`

Browser verification:
1. Rush Mode is enabled by default.
2. The bottom rush dock shows Walk-in, Reservation, Find guest, Service, Kitchen, and Staff.
3. Each dock action opens the canonical workflow.
4. Alt+1 through Alt+6 open those same jobs when not typing.
5. Host primary actions are larger and the lower-priority feed is hidden in Rush Mode.
6. Service high-risk/critical/food-ready filters remain obvious.
7. Kitchen recommended moves sort highest priority first.
8. Staff recommendations remain prominent.
9. Turning Rush Mode off restores the normal full workspace.

```powershell
git add -A
git commit -m "V65.50.0 rush hour speed and service compression"
git push origin live-service-timeline
```
