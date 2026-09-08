# Apply V100.2.7 Guest Journey Focus & Visibility Lifecycle

Merge this package into the root of the current authoritative Blue Current repository, preserving relative paths and replacing matching files only.

This is a forward-only focus lifecycle repair on top of V100.2.6. It does not change Guest Journey sequencing, guest/reservation data, authentication, Command shell ownership, navigation, server code, database code, RBAC, or persistence.

After merge run:

```powershell
npm run check
node scripts/maintenance/test-v100.2.7-guest-journey-focus-visibility-lifecycle.js
npm start
```

Acceptance: open Guest Journey Live, click **Run full journey**, then navigate away or allow the surface to be hidden. DevTools Console must not report a focused descendant being hidden by `aria-hidden` for `#guest-journey-live`. Repeat with **Reset**.
