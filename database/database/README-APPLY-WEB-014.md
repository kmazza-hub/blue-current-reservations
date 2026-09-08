# Apply WEB-014

Replace these files in the project root:
- `index.html`
- `platform.html`
- `solutions.html`
- `trust.html`
- `styles.css`
- `js/site.js`

Add these files:
- `integrations.html`
- `WEBSITE-SAAS-UPGRADE-14.md`

Then run:

```powershell
git add index.html platform.html solutions.html trust.html integrations.html styles.css js/site.js WEBSITE-SAAS-UPGRADE-14.md
git commit -m "WEB-014 integrations page"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
