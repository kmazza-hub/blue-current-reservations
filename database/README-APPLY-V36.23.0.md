# Apply Blue Current V36.23.0

Replace:
- client/index.html
- client/styles.css
- client/js/appState.js
- client/js/app-v15.1.3.js

Add the six files under client/js/modules/.

Then run:
```powershell
git add .
git commit -m "V36.23 accelerated profit control wave"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
