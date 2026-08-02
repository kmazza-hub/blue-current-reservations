# Apply WEB-021

Copy these files into the repository root, preserving paths:

- `index.html`
- `changelog.html`
- `styles.css`
- `js/site.js`
- `WEBSITE-SAAS-UPGRADE-21.md`

Then run:

```powershell
git add index.html changelog.html styles.css js/site.js WEBSITE-SAAS-UPGRADE-21.md
git commit -m "WEB-021 public changelog"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
