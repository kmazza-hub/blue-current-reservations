# APPLY V78.50.2

Run one command at a time:

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v78.50.1-command-auth-startup-race-hotfix.js
node scripts/maintenance/test-v78.50.2-light-surface-typography-contract.js
node scripts/maintenance/test-v78.25-product-surface-consolidation.js

npm run check
npm run start
```

Then hard refresh Edge:

`Ctrl + Shift + R`

Expected health version:

`"version":"78.50.2"`

Check Inventory Intelligence first. The large heading should now be dark/navy on the light background while the dark KPI cards retain bright white text.

Commit:

```powershell
git add -A
git commit -m "V78.50.2 enforce dark typography on light surfaces"
git push origin live-service-timeline
```
