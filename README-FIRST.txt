BLUE CURRENT V34.1.11 — CERTIFICATION RENEWAL & COMPLIANCE MONITOR

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/aiBrainAutonomyGuardrails.js

ADD
- client/js/modules/certificationRenewalMonitor.js

ADDS
- Continuous certificate-validity monitoring
- Renewal-due and expired-certificate detection
- Evidence and control drift analysis
- Eight continuous-compliance renewal gates
- Full 90-day renewal approval
- Conditional 30-day renewal
- Certificate suspension
- Compliance-coverage and posture scoring
- Copyable renewal and compliance brief
- Persistent renewal audit trail
- Guardrail enforcement for expired or suspended certifications

TEST
1. Replace/add the four files.
2. Run npm run check.
3. Run npm start.
4. Issue a certificate in Autonomy Assurance & Certification Center.
5. Open Certification Renewal & Compliance Monitor.
6. Review days remaining, evidence drift, control drift, and renewal gates.
7. Approve a full or conditional renewal.
8. Suspend a certificate and confirm matching bounded-autonomy actions become blocked.
9. Test Copy Compliance Brief.
