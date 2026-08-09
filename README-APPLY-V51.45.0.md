# APPLY BLUE CURRENT V51.45.0

Baseline: exact V51.40.0 repository.

Extract `BLUE-CURRENT-V51.45.0-MANAGEMENT-EXECUTIVE-ACCURACY.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Important behavior change

The existing Executive Command Center previously used deterministic fallback numbers when authoritative data was missing.

V51.45 removes those fallbacks.

After this wave, missing executive metrics display as unavailable rather than as plausible modeled numbers.

That means you may see more `—` values in the Executive Command Center until real restaurant/financial data is connected. This is intentional and required for pilot trust.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.45-management-executive-accuracy.js
node scripts/maintenance/test-v51.40-live-floor-service-certification.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.45.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Management & Executive Accuracy** surface appears after Live Floor & Service Certification.

Current Chefs data is expected to report:

`management-executive-accuracy-blocked`

because authoritative financial revenue data is not yet connected and four locations still lack live floor data.

This is not a regression. V51.45 intentionally stops missing source data from being disguised by synthetic values.

Git:

```powershell
git add -A
git commit -m "V51.45.0 harden management and executive accuracy"
git push origin live-service-timeline
```
