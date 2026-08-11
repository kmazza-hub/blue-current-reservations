# APPLY V62.50.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v62.50-staff-kitchen-service-usability.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `62.50.0`

Browser verification:
1. Staff opens Workforce Intelligence.
2. Tonight's Workforce and Staffing Recommendations are immediately visible.
3. Show staffing detail reveals role coverage, open shifts, and decision history.
4. Kitchen presents Recommended Moves before Station Pressure.
5. Kitchen actions show clearer urgency and Approve move wording.
6. Service Coordination exists and loads from the existing service API.
7. Service shows active tables, food ready, high risk, and service health.
8. All / High risk / Critical / Food ready filters work.
9. Run food / Deliver actions still use the existing service workflow.
10. Server load and operational alerts remain readable during service.

```powershell
git add -A
git commit -m "V62.50.0 perfect Staff Kitchen and Service Coordination"
git push origin live-service-timeline
```
