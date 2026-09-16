# Blue Current V100.3.76

This focused maintenance wave closes the remaining defects reproduced during the authenticated V100.3.75 Render audit.

## Certified changes

- Reasserts the operator's requested sidebar destination after focus-mode cleanup, with sequence protection so stale transitions cannot override newer clicks.
- Renders the Command source badge from every successfully loaded operating snapshot, settling historical data to `Demo snapshot`.
- Retains the latest certified pilot readiness result so the System workspace initializes with the same `HOLD`, blocker count, and health truth shown by Command.
- Raises the floating private-walkthrough link to the 44-pixel operator touch-target standard.
- Preserves authentication, visible secure sign-out, Render provisioning, runtime-marker continuity, database separation, and all earlier operational gates.

Run `INSTALL-V100.3.76.ps1`, then commit and push the certified source to `live-service-timeline` and manually deploy the newest commit on Render.
