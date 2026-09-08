# Hosted Deployment Handoff

Use the certified Git commit as the build source and `deploy/hosted-pilot/Dockerfile` as the container definition.

Required platform settings:

- One running application instance while JSON persistence is active.
- A persistent volume mounted at `/var/lib/blue-current`.
- HTTPS hostname `app.bluecurrentco.com`.
- Environment variables based on `deploy/hosted-pilot/environment.example`; enter values in the hosting platform, never commit a populated environment file.
- Health monitoring at `/api/health`.
- Graceful SIGTERM during deployments so the final backup checkpoint completes.

Before DNS cutover, run `npm run hosted:preflight` in the configured hosted environment, verify health and deployment readiness, restart the instance, confirm data/session survival, and perform a human-controlled backup restore rehearsal. DNS, rollback, and pilot activation remain human decisions.
