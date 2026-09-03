# V100.3.3 — Operator Review Evidence Integrity

Requires V100.3.2. Extract into the root of `blue-current-reservations`, then run:

```powershell
node APPLY-V100.3.3.js
node scripts/maintenance/test-v100.3.3-operator-review-evidence-integrity.js
```

Start or resume the hands-on review:

```powershell
node scripts/maintenance/operator-review-recorder-v100.3.3.js
```

Enter `STOP` at any scenario prompt to save and continue later with the same command. Evidence is written to:

- `evidence/operator-review-v100.3.3.json`
- `evidence/operator-review-v100.3.3-report.md`

This wave does not require a server restart because no runtime files change.
