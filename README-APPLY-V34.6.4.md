# Apply Blue Current V34.6.4

Replace these files in the repository root:

- `client/index.html`
- `client/styles.css`

Add:

- `V34.6.4-RELEASE.md`

Then test the authenticated application at desktop and mobile widths before committing.

Suggested Git commands:

```powershell
git add client/index.html client/styles.css V34.6.4-RELEASE.md
git commit -m "V34.6.4 application readability and contrast"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
