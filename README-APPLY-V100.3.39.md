# Apply Blue Current V100.3.39

V100.3.39 is a database-free certification overlay. Copy the ZIP contents into the repository root, then run the project check and the new certification.

## Included files

- `scripts/maintenance/test-v100.3.39-frontline-failure-rush-stress-certification.js`
- `V100.3.39-RELEASE.md`
- `README-APPLY-V100.3.39.md`

## Validation

```powershell
npm install
npm run check
node .\scripts\maintenance\test-v100.3.39-frontline-failure-rush-stress-certification.js
```

The certification must finish with every check passing. It uses a disposable temporary database and does not modify `database/data/blue-current.json` or its backup files.
