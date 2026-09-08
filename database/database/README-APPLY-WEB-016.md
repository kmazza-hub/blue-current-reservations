# Apply WEB-016

Copy these files into the project root, preserving paths.

## Replace
- `index.html`
- `platform.html`
- `solutions.html`
- `trust.html`
- `integrations.html`
- `developers.html`
- `styles.css`
- `js/site.js`

## Add or replace
- `about.html`
- `WEBSITE-SAAS-UPGRADE-16.md`

## Git
```powershell
git add index.html platform.html solutions.html trust.html integrations.html developers.html about.html styles.css js/site.js WEBSITE-SAAS-UPGRADE-16.md
git commit -m "WEB-016 company and about page"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
