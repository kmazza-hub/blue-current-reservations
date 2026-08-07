# Apply V41.2.0

Replace:
- client/index.html
- client/styles.css
- client/js/app-v15.1.3.js
- client/js/startup-loader.js

Add:
- client/js/modules/hospitalityOntologyEngine.js
- client/js/modules/hospitalityOntologyCenter.js
- client/js/modules/decisionObjectEngine.js
- client/js/modules/decisionObjectCenter.js
- client/js/modules/causalDecisionTraceEngine.js
- client/js/modules/causalDecisionTraceCenter.js
- V41.2.0-RELEASE.md
- README-APPLY-V41.2.0.md

Restart:
```powershell
taskkill /F /IM node.exe
npm run start
```

Open:
`http://localhost:8787/?pack=aip`
