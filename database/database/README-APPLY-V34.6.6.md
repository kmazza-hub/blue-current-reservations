# Apply Blue Current V34.6.6

Replace these files in the repository:

- `client/index.html`
- `client/styles.css`

Add:

- `V34.6.6-RELEASE.md`
- `README-APPLY-V34.6.6.md`

Then run:

```powershell
git add client/index.html client/styles.css V34.6.6-RELEASE.md README-APPLY-V34.6.6.md
git commit -m "V34.6.6 global readability system"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
