# Apply Blue Current V100.3.45

Copy the ZIP into the repository root, run validation, then start the physical LAN walkthrough:

```powershell
npm install
npm run check
node .\scripts\maintenance\test-v100.3.45-ipad-lan-acceptance-launch.js
npm run certify:pilot
npm run pilot:lan
```

The package contains no database files. `pilot:lan` is for same-Wi-Fi physical testing only, not production hosting.
