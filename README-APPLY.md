# Apply WEB-007

Replace these files in the root of `blue-current-reservations`:

- `index.html`
- `styles.css`
- `js/site.js`

Add:

- `WEBSITE-SAAS-UPGRADE-07.md`

Then run:

```powershell
git add index.html styles.css js/site.js WEBSITE-SAAS-UPGRADE-07.md
git commit -m "WEB-007 operational evidence room"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```

If a rebase conflict occurs in these three website files and this patch is the version you intend to keep, use `git checkout --theirs <file>` during the rebase, then add the files and continue.
