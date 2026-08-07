# Apply V42.14.2

Replace:

- `server/services/databaseService.js`
- `server/server.js`

Add:

- `scripts/maintenance/test-database-reliability.js`
- `V42.14.2-RELEASE.md`
- `README-APPLY-V42.14.2.md`

Then run:

```powershell
node .\scripts\maintenance\test-database-reliability.js
npm run start
```

After startup, verify `GET /api/health` is HTTP 200 and refresh `/?pack=live` while authenticated. The V42 live endpoints should no longer fail because a transient OneDrive/Windows rename lock occurred.
