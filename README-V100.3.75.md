# Blue Current V100.3.75

This certified maintenance wave closes the defects found during the full authenticated Render audit.

## What changes

- Makes the persistent sidebar use one deterministic click owner so every Command, Guests, Service, Team, Kitchen, Inventory, Performance, Executive, Integrations, and System transition remains responsive after earlier navigation.
- Replaces the unresolved `Source checking` state with `Demo snapshot` whenever historical seed data is shown.
- Makes the System readiness summary consume the same certified pilot-readiness result used by Command, removing premature `Pilot ready` and synthetic health claims.
- Gives core operator controls a minimum 44-pixel target.
- Reserves clearance for the rush-hour action dock so it does not cover lower Command content.
- Preserves the authenticated session, visible secure sign-out, hosted database, and Render provisioning boundary from V100.3.74.

## Install

Run `INSTALL-V100.3.75.ps1` from this extracted package. The installer requires certified V100.3.74, validates the configured runtime database before and after installation, installs dependencies, runs source validation, and runs the complete pilot certification chain.

After certification, commit and push the update to `live-service-timeline`, then manually deploy the latest commit on Render.
