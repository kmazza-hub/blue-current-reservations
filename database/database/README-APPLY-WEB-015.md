# Apply Blue Current WEB-015

Copy these files into the project root and overwrite the matching existing files:

- `index.html`
- `platform.html`
- `solutions.html`
- `trust.html`
- `integrations.html`
- `styles.css`
- `js/site.js`

Add these new files:

- `developers.html`
- `WEBSITE-SAAS-UPGRADE-15.md`

Then run:

```powershell
git add index.html platform.html solutions.html trust.html integrations.html developers.html styles.css js/site.js WEBSITE-SAAS-UPGRADE-15.md
git commit -m "WEB-015 developers and API page"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
