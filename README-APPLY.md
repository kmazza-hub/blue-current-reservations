# Apply Blue Current WEB-006

Replace these existing files in the project root:

- `index.html`
- `styles.css`
- `js/site.js`

Add this release note:

- `WEBSITE-SAAS-UPGRADE-06.md`

No other files changed.

## Git

```powershell
git add index.html styles.css js/site.js WEBSITE-SAAS-UPGRADE-06.md
git commit -m "website SaaS upgrade 06"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
