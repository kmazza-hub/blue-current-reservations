# Apply Blue Current WEB-011

This is a changed-files-only patch.

## Replace
Copy these files into the root of `blue-current-reservations`, preserving the folders:

- `platform.html`
- `styles.css`
- `js/site.js`

## Add
- `WEBSITE-SAAS-UPGRADE-11.md`

## Git commands
Run only the commands below from the project folder:

```powershell
git add platform.html styles.css js/site.js WEBSITE-SAAS-UPGRADE-11.md
git commit -m "WEB-011 platform page 2.0"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```

If a rebase conflict occurs, stop and inspect the named files before choosing a version.
