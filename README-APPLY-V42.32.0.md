# Apply Blue Current V42.32.0

Replace:
- client/index.html
- client/styles.css
- client/js/app-v15.1.3.js
- client/js/startup-loader.js
- server/server.js
- server/api/router.js
- server/services/liveIntegrationService.js

Add:
- client/js/modules/providerRecoveryDrillEngine.js
- client/js/modules/providerRecoveryDrillCenter.js
- client/js/modules/providerContinuityTelemetryEngine.js
- client/js/modules/providerContinuityTelemetryCenter.js
- client/js/modules/v42ReleaseCertificationEngine.js
- client/js/modules/v42ReleaseCertificationCenter.js
- V42.32.0-RELEASE.md
- README-APPLY-V42.32.0.md

Restart:
taskkill /F /IM node.exe
npm run start

Open:
http://localhost:8787/?pack=live

Recommended test order:
1. Configure or verify a provider failover plan.
2. Run Provider Recovery Drill.
3. Refresh Provider Continuity Telemetry.
4. Run Live Operations Release Certification.
