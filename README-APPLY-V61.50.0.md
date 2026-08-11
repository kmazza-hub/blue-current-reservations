# APPLY V61.50.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v61.50-command-live-usability.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `61.50.0`

Browser verification:
1. Command opens with restaurant pulse / manager work first.
2. Leadership & analysis is hidden until requested.
3. Live immediately shows KPIs and next best action.
4. Manager Copilot prompts are short and readable.
5. Timeline empty state explains what will appear.
6. System connections stay hidden unless troubleshooting is needed.
7. All Live text remains bright on dark cards.
8. Existing interactions still work.

```powershell
git add -A
git commit -m "V61.50.0 perfect Command and Live usability"
git push origin live-service-timeline
```
