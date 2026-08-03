# Apply V37.20.0

Replace:

- `client/index.html`
- `client/styles.css`
- `client/js/app-v15.1.3.js`
- `client/js/startup-loader.js`

Add:

- `client/js/modules/subscriptionLifecycleEngine.js`
- `client/js/modules/subscriptionLifecycleCenter.js`
- `client/js/modules/storageFootprintEngine.js`
- `client/js/modules/storageFootprintCenter.js`
- `client/js/modules/runtimeReadinessEngine.js`
- `client/js/modules/runtimeReadinessCenter.js`
- `V37.20.0-RELEASE.md`
- `README-APPLY-V37.20.0.md`

Restart Node and test focused mode at `http://localhost:8787/`.
