# APPLY BLUE CURRENT V51.25.0

Baseline: exact V51.20.0 repository.

Extract `BLUE-CURRENT-V51.25.0-ROLE-PERMISSION-CERTIFICATION.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

This wave contains an intentional authorization hardening:

- `owner` now receives the `admin` permission
- `administrator` now receives the `admin` permission
- the role permission matrix is centralized through `AuthService.permissionsForRole()`

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.25-role-permission-certification.js
node scripts/maintenance/test-v51.20-data-integrity-recovery.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.25.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Role & Permission Certification** surface appears after Data Integrity & Recovery.

Important:

- UI visibility is not used as a security boundary
- API permissions remain authoritative
- wildcard location scope is reserved for owner/administrator profiles
- certification itself does not change roles or scopes
- no automatic role escalation or scope expansion occurs

Git:

```powershell
git add -A
git commit -m "V51.25.0 certify role and permission boundaries"
git push origin live-service-timeline
```
