# APPLY V64.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v64.0-interaction-qa.js
node scripts/maintenance/test-v63.50-full-system-usability.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `64.0.0`

Browser verification:
1. Submit a normal write action and confirm visible success feedback.
2. Force/observe a failed write and confirm the action reports failure instead of silently doing nothing.
3. Temporarily disconnect network and confirm offline status appears.
4. Double-click a form submit and confirm duplicate submission is prevented.
5. Confirm submit buttons visibly enter a working state.
6. Test Main floor / Waterfront / Private dining controls at Host Stand.
7. Add a walk-in/reservation and seat a waitlist guest; confirm visible success feedback.
8. Verify Command, Live, Floor, Reservations, Staff, Kitchen, Service, AI Brain, and Executive still navigate correctly.

```powershell
git add -A
git commit -m "V64.0.0 interaction QA and action feedback"
git push origin live-service-timeline
```
