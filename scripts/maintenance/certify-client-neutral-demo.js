"use strict";
const {spawnSync}=require("node:child_process"),path=require("node:path"),root=path.resolve(__dirname,"../..");
const files=[
 "scripts/maintenance/certify-v100.3.100-universal-system.js",
 "scripts/maintenance/test-v100.3.101-ipad-host-return.js",
 "scripts/maintenance/test-v100.3.102-holiday-auto-date.js",
 "scripts/maintenance/test-v100.3.103-production-readiness.js",
 "scripts/maintenance/test-v100.3.104-details-contrast.js",
 "scripts/maintenance/test-client-neutral-reservation-api.js",
 "scripts/maintenance/test-client-neutral-host.js",
 "scripts/maintenance/test-client-neutral-phone-book.js",
 "scripts/maintenance/test-client-neutral-reservation-input.js",
 "scripts/maintenance/test-v100.3.116-managed-protection.js",
 "scripts/maintenance/test-v100.3.116-hosted-backup-runtime.js",
 "scripts/maintenance/test-v100.3.58-runtime-backup-safe-recovery.js",
 "scripts/maintenance/test-v100.3.59-scheduled-backup-health.js",
 "scripts/maintenance/test-v100.3.60-server-coordinated-backup.js",
 "scripts/maintenance/test-v100.2.90-ipad-resume-guard-ownership-integrity.js",
 "scripts/maintenance/test-v100.2.91-ipad-resume-render-commit-integrity.js",
 "scripts/maintenance/test-client-neutral-demo.js",
 "scripts/maintenance/test-client-neutral-manager.js",
 "scripts/maintenance/test-client-neutral-command.js",
 "scripts/maintenance/test-client-neutral-pilot-gate.js",
 "scripts/maintenance/test-client-neutral-shift.js",
 "scripts/maintenance/test-client-neutral-shift-api.js",
 "scripts/check-release-data.js"
];
for(const file of files){const result=spawnSync(process.execPath,[path.join(root,file)],{cwd:root,stdio:"inherit"});if(result.status!==0)process.exit(result.status||1);}
console.log("Client-neutral universal certification passed; generic demos retain authentication, isolation, readiness gates and saved lifecycle state.");
