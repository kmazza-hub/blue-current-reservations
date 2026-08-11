# APPLY V63.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v63.0-ai-executive-usability.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `63.0.0`

Browser verification:
1. AI Brain opens with the highest-priority decision and evidence question workflow first.
2. Show advanced intelligence reveals the deeper intelligence platform.
3. Kitchen navigation still reveals Kitchen when the AI advanced surface is collapsed.
4. Executive opens with leadership alerts and the executive brief first.
5. Show portfolio detail reveals locations, selected-location detail, demand, and guest moments.
6. Tonight / 7 Days / 30 Days still change executive reporting.
7. Location rows remain selectable by mouse and keyboard.
8. Download briefing downloads a text briefing using current screen values.
9. View guest intelligence navigates to Guest Intelligence.

```powershell
git add -A
git commit -m "V63.0.0 perfect AI Brain and Executive decision clarity"
git push origin live-service-timeline
```
