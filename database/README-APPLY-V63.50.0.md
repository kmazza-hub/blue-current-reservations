# APPLY V63.50.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v63.50-full-system-usability.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `63.50.0`

Browser verification:
- test all top navigation destinations
- open a direct hash URL to a normally hidden tool/advanced section and confirm it reveals
- verify Command, Live, Floor, Reservations, Staff, Kitchen, Service, AI Brain, and Executive
- confirm pending values do not look like unexplained broken dashes
- open/close dialogs and confirm focus returns safely
- scroll through primary workspaces and confirm top navigation follows
- verify keyboard focus and primary touch targets remain obvious/readable

```powershell
git add -A
git commit -m "V63.50.0 full system usability guardrails"
git push origin live-service-timeline
```
