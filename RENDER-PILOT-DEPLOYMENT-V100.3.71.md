# Render Pilot Deployment — V100.3.71

V100.3.71 prepares one controlled, always-on Blue Current pilot service on Render without changing DNS or uploading restaurant data automatically.

## Safe first deployment

1. Create the Render Blueprint from `render.yaml`.
2. When Render prompts for `BLUE_CURRENT_PROVISIONING_MODE`, enter `true`.
3. Confirm `/api/health` reports `PROVISIONING_REQUIRED`; all application routes must return 503.
4. Transfer the exact certified pilot database into a temporary secure path using Render Shell/SCP.
5. Provision the fresh disk once:

   `npm run hosted:provision -- --source /secure-transfer/blue-current.json --target /var/lib/blue-current/blue-current.json`

6. Verify the provisioned bytes:

   `npm run hosted:provision -- --verify --target /var/lib/blue-current/blue-current.json`

7. Change `BLUE_CURRENT_PROVISIONING_MODE` to `false` in Render and manually deploy the certified commit.
8. Confirm health, authentication, restart continuity, and verified backups before changing DNS.

## Guardrails

- Exactly one instance while JSON persistence is active.
- Manual deployments only.
- The persistent disk mounts at `/var/lib/blue-current`.
- The application remains locked while the database is absent.
- No database, credentials, populated environment file, or DNS mutation is included in this release.
- Render disk snapshots complement but do not replace Blue Current's verified application backups or the planned off-server backup step.
