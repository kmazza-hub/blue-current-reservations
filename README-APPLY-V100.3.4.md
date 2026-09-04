# V100.3.4 — Physical iPad Operator Focus

Apply these files over the current V100.3.3 repository root, preserving paths.

## Scope
- deterministic Service and Kitchen Quick Job landing after workspace activation
- preserves working Staff destination
- full-screen iPad Floor focus mode
- seating automatically enters Floor focus
- seating completion exits Floor focus
- iPad Safari safe viewport/scroll settling

No backend, authentication, database, service lifecycle, kitchen lifecycle, or staffing truth semantics are changed.

## Validate
`npm run check`
`node scripts/maintenance/test-v100.3.4-ipad-operator-focus.js`
`node scripts/maintenance/test-v100.3.3-operator-review-evidence-integrity.js`
`node scripts/maintenance/test-v100.3.2-human-operator-review-protocol.js`
