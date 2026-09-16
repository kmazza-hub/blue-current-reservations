# Blue Current V100.3.72 — Authenticated Readiness Continuity

This forward-only reliability release closes the post-login lock discovered during the first live Render audit.

- Replaces stale startup authentication readiness with the current session state after login or sign-out.
- Prevents a completed anonymous restore from being reused after a successful login.
- Proves that the first protected bootstrap request proceeds with the authenticated bearer token.
- Cache-advances the corrected session authority.
- Preserves both the planned `app.bluecurrentco.com` origin and the active Render pilot origin in the Blueprint.
- Removes Render's disk-incompatible `maxShutdownDelaySeconds` Blueprint setting.
- Preserves the external local runtime database and the already provisioned Render disk.

The installer expects certified V100.3.71. It does not package, overwrite, upload, or modify either runtime database.
