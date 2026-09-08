# Apply V42.8.0

Replace the changed files and add the new modules from this patch.

Restart:

```powershell
taskkill /F /IM node.exe
npm run start
```

Open:

`http://localhost:8787/?pack=live`

Recommended test:
1. Confirm Source Adapter Registry loads.
2. Use an existing sandbox connector of the matching source type.
3. POST a provider-shaped event through `/api/live/adapters/:adapterId/ingest`.
4. Send the exact same source event ID again and confirm it is counted as a duplicate rather than persisted twice.
5. Refresh Delivery Assurance and Ingestion Observability.
