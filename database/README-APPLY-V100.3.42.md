# Apply Blue Current V100.3.42

Copy the ZIP contents into the repository root, then run:

```powershell
npm install
npm run check
node .\scripts\maintenance\test-v100.3.42-hosted-pilot-environment-gate.js
```

This overlay prepares and certifies the hosted-pilot boundary. It does not deploy hosting or change DNS, and it contains no database files.
