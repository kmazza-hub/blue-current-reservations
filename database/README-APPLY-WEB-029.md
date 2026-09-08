# APPLY WEB-029

Extract the ZIP into the repository root.

Validate:

```powershell
node scripts/maintenance/test-web-029-hospitality-storyfront.js
npm run check
npm run start
```

Then review the public homepage locally and deploy through the existing website workflow.

Commit:

```powershell
git add -A
git commit -m "WEB-029 hospitality storyfront"
git push origin live-service-timeline
```
