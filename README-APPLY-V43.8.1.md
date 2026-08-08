# Apply V43.8.1

Replace the files in this patch over the current V43.8.0 repository.

## Test before startup

```powershell
node .\scripts\maintenance\test-database-read-reliability.js
```

Expected output begins with:

```text
Database read reliability test passed.
```

## Restart

```powershell
taskkill /F /IM node.exe
npm run start
```

If taskkill reports no Node process, continue normally.

Open:

```text
http://localhost:8787/?pack=executive
```

The startup console should identify V43.8.1. Refresh the Executive pack and verify that the previous `/api/executive/*` `EMFILE` 500 responses no longer occur.
