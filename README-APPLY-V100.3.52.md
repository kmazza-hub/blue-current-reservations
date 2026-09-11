# Apply Blue Current V100.3.52

Copy the contents of the V100.3.52 package over the existing project folder and allow Windows to replace matching application files. Do not delete the existing project folder first.

The upgrade intentionally omits `.env`, `node_modules`, `.git`, and the live files inside `database/data`. Your current credentials, installed packages, Git history, and restaurant data therefore remain in place.

Then run:

```powershell
npm install
npm run check
npm run certify:pilot
npm run start
```

The final certification status must be `CONTROLLED_DEMONSTRATION_READY` before opening a new demonstration tunnel.
