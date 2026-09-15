# Blue Current V100.3.69 — Smart Fill single-action reliability

- Prevents duplicate scheduling workspace initialization.
- Allows only one Smart Fill request at a time.
- Makes repeated identical assignment requests idempotent.
- Replaces the browser alert with readable in-dialog status.
- Returns a clear client error when a recommendation is genuinely stale.
- Preserves the external runtime database during installation.

Run `INSTALL-V100.3.69.ps1`, restart Blue Current, hard-refresh, and test one open shift with **Apply best match**.
