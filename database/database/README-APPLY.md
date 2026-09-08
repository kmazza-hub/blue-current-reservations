# Apply Blue Current WEB-008

Replace these files in the project root:

- `index.html`
- `styles.css`
- `js/site.js`

Add:

- `WEBSITE-SAAS-UPGRADE-08.md`

Then run:

```powershell
git add index.html styles.css js/site.js WEBSITE-SAAS-UPGRADE-08.md
git commit -m "WEB-008 enterprise buyer paths"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```

No other project files changed.
