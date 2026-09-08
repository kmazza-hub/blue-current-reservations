# APPLY V60.50.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v60.50-shift-focus-universal-usability.js
node scripts/maintenance/test-v60.0-operator-priority-readability.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `60.50.0`

Browser checks:
- Shift Focus is the default workspace
- only primary restaurant work is visible at first
- Show insights reveals supporting operating intelligence
- Show tools reveals specialist/configuration surfaces
- Show advanced controls reveals release/certification surfaces
- all primary controls are large enough for fast use
- input text is bright and readable in dim-room conditions
- icon-only controls have accessible labels/tooltips
- RELEASE/HOLD/ROLLBACK-style actions are visually distinct from everyday actions
- keyboard focus remains obvious

```powershell
git add -A
git commit -m "V60.50.0 shift focus and universal usability"
git push origin live-service-timeline
```
