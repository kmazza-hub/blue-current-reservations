# V100.2.90 — iPad Resume Guard Ownership Integrity

Makes the resume interaction guard ownership-safe. If another Blue Current subsystem already owns `inert`, `aria-busy`, or resume-guard metadata, the iPad resume lifecycle restores those exact values instead of clearing them.

```powershell
node APPLY-V100.2.90.js
node scripts/maintenance/test-v100.2.90-ipad-resume-guard-ownership-integrity.js
```
