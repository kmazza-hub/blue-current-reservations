# Apply V42.14.1 Repository Cleanup

If replacing your repository with the cleaned full ZIP, no cleanup command is required.

If applying only the maintenance files to an existing checkout, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\maintenance\v42.14.1-repository-cleanup.ps1
npm run check
npm run start
```

Then commit deletions with:

```powershell
git add -A
git commit -m "V42.14.1 repository cleanup"
git push
```
