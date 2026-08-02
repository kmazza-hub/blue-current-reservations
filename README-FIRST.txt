BLUE CURRENT V34.1.10 — AUTONOMY ASSURANCE & CERTIFICATION CENTER

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/aiBrainAutonomyGuardrails.js

ADD
- client/js/modules/autonomyAssuranceCertification.js

ADDS
- Domain certification matrix for Kitchen, Staffing, Floor, Demand, and Executive Recovery
- Eight certification gates covering outcomes, value, rollout, incidents, recovery, governor authorization, and audit continuity
- Evidence and control scoring
- Certified, Conditional, and Not Certified states
- 90-day full certificates and 30-day conditional certificates
- Certification expiry monitoring
- Certificate issuance and revocation
- Copyable assurance report
- One-click certification-aligned guardrail policy
- Persistent certification audit history
- Guardrail enforcement requiring a current domain certificate for bounded execution

TEST
1. Replace/add the four files.
2. Run npm run check.
3. Run npm start.
4. Select each domain and review its certification gates.
5. Build sufficient outcome, rollout, incident, and recovery evidence.
6. Issue a Conditional or Certified certificate.
7. Confirm bounded execution requires a current certificate.
8. Apply the certification policy and confirm Autonomy Guardrails updates.
9. Revoke a certificate and confirm the domain returns to approval-required operation.
10. Test Copy Assurance Report.
