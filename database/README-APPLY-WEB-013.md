# Apply Blue Current WEB-013

Copy these files into the project root, preserving paths:

## Replace
- `index.html`
- `platform.html`
- `solutions.html`
- `trust.html`
- `styles.css`
- `js/site.js`

## Add
- `WEBSITE-SAAS-UPGRADE-13.md`

Then run:

```powershell
git add index.html platform.html solutions.html trust.html styles.css js/site.js WEBSITE-SAAS-UPGRADE-13.md
git commit -m "WEB-013 security trust center"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
