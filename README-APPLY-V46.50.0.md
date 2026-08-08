# APPLY BLUE CURRENT V46.50.0

## Baseline

This package must be applied to the exact V46.45.0 repository baseline used to build the package.

Unlike earlier overlay-only patches, V46.50 permanently retires two source files, so use the guarded apply script.

## Apply from PowerShell

From your `blue-current-reservations` repository root:

```powershell
$pkg = Join-Path $env:TEMP "blue-current-v4650"
Remove-Item $pkg -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $pkg | Out-Null

Expand-Archive "PATH\TO\BLUE-CURRENT-V46.50.0-AUTHORITATIVE-RETIREMENT.zip" -DestinationPath $pkg -Force

node "$pkg\APPLY-V46.50.0.js" --repo .
```

The script will:
- verify baseline hashes
- create a rollback backup outside the repo
- apply the V46.50 payload
- retire the two authorized module files
- verify final hashes
- run full validation
- run the focused retirement certification
- restore automatically if validation fails

## After application

```powershell
npm run check
node scripts/maintenance/test-authoritative-retirement-v46.50.js
npm run start
```

In another PowerShell window:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "46.50.0"
```

## Expected retired files

```text
client/js/modules/enterpriseValuePlanCenter.js
client/js/modules/enterpriseValuePlanEngine.js
```

## Git checkpoint

After validation:

```powershell
git status
git add -A
git diff --cached
git commit -m "V46.50.0 retire enterprise value plan center"
git push origin live-service-timeline
```

Use `git add -A` here because this release intentionally includes two file deletions.

## Rollback

The apply script prints the external backup directory it creates.

The delivery package also contains:

`BLUE-CURRENT-V46.50.0-ROLLBACK.zip`

Do not remove the backup until the V46.50 commit is pushed and verified.
