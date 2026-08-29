# V100.2.70 — Startup / Runtime Performance Hardening

Apply from the repository root:

```powershell
node APPLY-V100.2.70.js
npm run check
node scripts/maintenance/test-v100.2.70-startup-runtime-performance.js
npm start
```

This wave reduces focused startup pressure without deleting functionality. Nonessential V37 diagnostic/release scripts move behind the existing deferred-loader path, while V100.2.60–.69 Kitchen/Staff/Manager enhancements load only when their workspace is requested. Use `?full=1` when intentionally loading the complete platform.
