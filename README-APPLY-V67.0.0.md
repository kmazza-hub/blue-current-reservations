# APPLY V67.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v67.0-mobile-ui.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `67.0.0`

Mobile verification:
1. Open on iPhone-size width.
2. Confirm light cards are bright with dark readable text.
3. Confirm Live and Service dark cards use bright white/light-blue text.
4. Confirm headings do not overflow.
5. Confirm cards stack cleanly with less vertical dead space.
6. Confirm Host navigation is two columns.
7. Confirm forms fit the screen with no horizontal overflow.
8. Confirm wide service tables scroll horizontally.
9. Confirm Rush Dock fits in three columns.
10. Confirm toast/recovery messages do not cover primary controls.

```powershell
git add -A
git commit -m "V67.0.0 fix mobile colors spacing and touch layout"
git push origin live-service-timeline
```
