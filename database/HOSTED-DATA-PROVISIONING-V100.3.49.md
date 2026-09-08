# Hosted Data Provisioning

Provision only after selecting and preserving the exact locally certified database intended for the pilot.

```text
npm run hosted:provision -- --source /secure-transfer/blue-current.json --target /var/lib/blue-current/blue-current.json
npm run hosted:provision -- --verify --target /var/lib/blue-current/blue-current.json
```

The destination must be a fresh persistent volume. The command refuses an existing database or manifest. After verification, run hosted preflight, start one instance, verify `/api/health`, restart, and confirm that the same restaurant configuration and authenticated session survive.

Replacing an existing hosted database is intentionally not supported by this command. Recovery and rollback remain separate, stopped-runtime, human-approved procedures.
