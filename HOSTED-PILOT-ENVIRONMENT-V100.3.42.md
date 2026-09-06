# Blue Current Hosted Pilot Environment

This is the required environment boundary for `https://pilot.bluecurrentco.com`. It prepares deployment; it does not perform DNS, hosting, cutover, or pilot activation.

## Runtime

- One Node.js 18+ application instance.
- `BLUE_CURRENT_ENV=production`.
- `BLUE_CURRENT_PUBLIC_URL=https://pilot.bluecurrentco.com`.
- `BLUE_CURRENT_ALLOWED_ORIGINS=https://pilot.bluecurrentco.com`.
- HTTPS terminated by the hosting platform or Cloudflare.
- Health monitoring against `/api/health`.

## Persistence

- Attach persistent storage to the application instance.
- Set `BLUE_CURRENT_DB` to an absolute path on that storage, outside the deployed repository.
- Keep one application writer while the JSON persistence driver is active.
- Preserve the primary file and its `.bak`, `.bak.meta.json`, `.bak.prev`, and `.bak.prev.meta.json` recovery chain.
- Verify restart survival and a recovery restore before the pilot.

## Secrets and access

- Store secret values only in the hosting environment.
- Persist connector secret environment-variable names, never their values.
- Do not allow localhost, wildcard, or temporary `trycloudflare.com` browser origins in production.
- Use individual operator accounts and revoke any account that should not enter the pilot.

## Controlled deployment

1. Deploy the Git commit already certified locally.
2. Attach persistent storage before first production startup.
3. Apply environment variables without committing a `.env` file.
4. Start one instance and confirm `/api/health`.
5. Run the deployment-readiness endpoint as an admin.
6. Install the hosted PWA on the pilot iPad.
7. Rerun the physical iPad acceptance and frontline lifecycle.
8. Record human go/no-go; do not activate the restaurant pilot automatically.

Rollback means restoring the prior certified Git release and its compatible verified database backup. DNS and pilot activation remain human-controlled.
