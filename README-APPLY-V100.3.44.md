# Apply Blue Current V100.3.44

Copy the ZIP into the repository root, then run:

```powershell
npm install
npm run check
node .\scripts\maintenance\test-v100.3.44-physical-operator-acceptance-gate.js
npm run certify:pilot
```

The automated gate proves acceptance cannot be fabricated. It does not replace the real physical-iPad walkthrough and contains no database files.
