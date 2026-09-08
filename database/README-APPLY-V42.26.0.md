# Apply V42.26.0

Replace the files included in this patch and add the new provider continuity modules. Then restart Blue Current:

```powershell
taskkill /F /IM node.exe
npm run start
```

Open `http://localhost:8787/?pack=live`.

Recommended test order:
1. Refresh Provider Delivery SLA.
2. Save an SLA for `toast-pos`.
3. Quarantine `toast-pos`, then verify a signed webhook is rejected and appears in the receipt ledger.
4. Resume the source.
5. Run Provider Operations Gate.
