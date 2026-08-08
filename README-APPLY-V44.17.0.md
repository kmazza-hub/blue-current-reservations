# Apply Blue Current V44.17.0

1. Stop Blue Current: `taskkill /F /IM node.exe`
2. Extract the patch over the authoritative repository and replace changed files.
3. Do not replace `database/data/blue-current.json`; it is intentionally absent.
4. Run `npm run check`.
5. Run `node scripts/maintenance/test-aip-durable-workflows.js`.
6. Run `npm run start`.
7. Verify `curl.exe -s http://localhost:8787/api/health` reports version `44.17.0`.

V44.17.0 remains governed dry-run infrastructure; it does not enable live restaurant mutations.
