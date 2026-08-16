# APPLY V83.25.1

Extract this ZIP into the repository root and allow the files to merge.

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v83.25.1-light-surface-typography-hotfix.js
npm run check
npm run start
```

Expected:

`"version":"83.25.1"`

After the browser opens, hard refresh once with `Ctrl+Shift+R`.

```powershell
git add -A
git commit -m "V83.25.1 fix light surface typography contrast"
git push origin live-service-timeline
```
