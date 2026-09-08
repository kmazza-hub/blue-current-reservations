# APPLY BLUE CURRENT V51.30.0

Baseline: exact V51.25.0 repository.

Extract `BLUE-CURRENT-V51.30.0-OPERATOR-UX-HARDENING.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.30-operator-ux-hardening.js
node scripts/maintenance/test-v51.25-role-permission-certification.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.30.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Operator UX Hardening** surface appears after Role & Permission Certification.

Pilot fast navigation:

- Alt+1 Opening / Shift Start
- Alt+2 Reservations
- Alt+3 Seating / Floor
- Alt+4 Active Service
- Alt+5 Kitchen
- Alt+6 Guest Recovery
- Alt+7 Shift Closeout
- Alt+8 Pilot Readiness

Important:

- keyboard shortcuts jump to existing operating centers
- existing workflow behavior is preserved
- high/critical UX findings block certification until human-resolved
- certification does not automatically alter the UI or execute operational actions

Git:

```powershell
git add -A
git commit -m "V51.30.0 harden operator UX for pilot"
git push origin live-service-timeline
```
