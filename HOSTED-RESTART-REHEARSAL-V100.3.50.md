# Hosted Restart Rehearsal

Run this only with the exact database copy selected for controlled hosted provisioning:

```text
npm run hosted:rehearse -- --source /secure-transfer/blue-current.json --public-url https://app.bluecurrentco.com
```

The command copies the source into a disposable directory, starts Blue Current twice in production mode, validates health and graceful backup creation, compares core record counts, and deletes the rehearsal copy. It does not change the selected source, provision the hosted volume, deploy, or change DNS.

A passing rehearsal is required before first hosted provisioning, but it is not physical iPad acceptance or human go-live approval.
