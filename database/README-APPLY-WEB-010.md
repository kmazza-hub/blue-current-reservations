# Apply Blue Current WEB-010

Replace these files in the project root:

- `index.html`
- `styles.css`
- `js/site.js`

Add:

- `WEBSITE-SAAS-UPGRADE-10.md`

Then run:

```powershell
git add index.html styles.css js/site.js WEBSITE-SAAS-UPGRADE-10.md
git commit -m "WEB-010 homepage conversion system"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
