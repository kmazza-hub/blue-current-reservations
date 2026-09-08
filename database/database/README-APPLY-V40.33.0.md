# Apply Blue Current V40.33.0

1. Extract this patch into the root of `blue-current-reservations`.
2. Run the guarded cleanup script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\maintenance\remove-v32-snapshot.ps1
```

3. Validate the application:

```powershell
npm run check
npm run start
```

4. Open:

```text
http://localhost:8787/?pack=aip
```

5. Commit all deletions and maintenance files:

```powershell
git status
git add -A
git commit -m "V40.33 repository consolidation"
git push
```

## Expected deletion

Only this inactive embedded snapshot is removed:

`Blue-Current-v32.2.3-auth-startup-order-hotfix/`

Do not manually delete the active `client`, `server`, `shared`, or `scripts` directories.
