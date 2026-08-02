BLUE CURRENT V34.1.12 — COMPLIANCE EVIDENCE VAULT

REPLACE
- client/index.html
- client/styles.css

ADD
- client/js/modules/complianceEvidenceVault.js

ADDS
- Unified evidence index across certificates, renewals, outcomes, incidents, recovery, rollouts, and policies
- Domain and evidence-type filtering
- Deterministic record-integrity hashes
- One-click evidence verification
- Evidence-gap detection by operating domain
- Audit-readiness scoring
- Audit package generation
- Copyable audit package
- Downloadable JSON evidence package
- Persistent vault audit history
- Direct navigation to source modules

TEST
1. Replace/add the three files.
2. Run npm run check.
3. Run npm start.
4. Create certificates, renewals, outcomes, incidents, recovery plans, and rollout records.
5. Open Compliance Evidence Vault.
6. Test domain and evidence-type filters.
7. Select records and verify integrity.
8. Review evidence gaps and audit-readiness scoring.
9. Generate, copy, and download the audit package.
