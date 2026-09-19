# Blue Current V100.3.86 — Client Launch Hardening

This release closes the live primary-navigation regression discovered during the customer-readiness audit.

## Changes

- Activates Command, Guests, Service, Team, Kitchen, Inventory, Performance, Executive, Integrations, and System synchronously from the originating interaction.
- Re-checks the requested workspace after competing legacy handlers settle.
- Preserves mouse, touch, Enter, and Space navigation.
- Adds a visible keyboard focus treatment.
- Enforces a 44px minimum height for authenticated operating controls.
- Aligns the package and shell version at V100.3.86.

## Certification

Run:

```powershell
npm run certify:pilot
```

Deployment still requires the human-controlled readiness gates shown in Command. This release does not bypass, seed, or rewrite restaurant readiness evidence.
