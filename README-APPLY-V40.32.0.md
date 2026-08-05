# Apply Blue Current V40.32.0

Replace:
- client/index.html
- client/styles.css
- client/js/app-v15.1.3.js
- client/js/startup-loader.js

Add:
- client/js/modules/aipImprovementBacklogEngine.js
- client/js/modules/aipImprovementBacklogCenter.js
- client/js/modules/aipPromptExperimentEngine.js
- client/js/modules/aipPromptExperimentCenter.js
- client/js/modules/aipLearningReleaseGateEngine.js
- client/js/modules/aipLearningReleaseGateCenter.js

Restart:

```powershell
taskkill /F /IM node.exe
npm run start
```

Open:

```text
http://localhost:8787/?pack=aip
```
