# APPLY V59.50.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v59.50-product-experience-perfection.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `59.50.0`

Browser verification:
1. Open the tunnel.
2. Confirm Command Center is the first major operating surface.
3. Confirm the desktop navigation is reduced to the core workflow.
4. Confirm `Show advanced controls` reveals all retained release/certification surfaces.
5. Confirm `?advanced=1` opens advanced controls directly.
6. Check Command, Live, Floor, Reservations, Staff, Kitchen, Executive, and AI Brain at desktop and mobile widths.

```powershell
git add -A
git commit -m "V59.50.0 product experience perfection"
git push origin live-service-timeline
```
