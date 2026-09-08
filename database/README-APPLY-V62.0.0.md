# APPLY V62.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v62.0-floor-reservations-usability.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `62.0.0`

Browser verification:
1. Floor is the default Host Stand view.
2. Reservations opens a dedicated tonight list.
3. Waitlist opens the live waitlist focus.
4. Guests opens guest search.
5. Search guest button jumps directly to guest search.
6. + Reservation opens the structured reservation form.
7. + Add walk-in opens the walk-in form.
8. Seat visibly completes a waitlist item and reduces wait count.
9. Reservation Details opens guest context.
10. Existing table selection and Table 14 assignment still work.

```powershell
git add -A
git commit -m "V62.0.0 perfect Floor and Reservations workflow"
git push origin live-service-timeline
```
