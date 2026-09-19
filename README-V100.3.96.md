# Blue Current V100.3.96 — Manifest Content Type

This focused standards correction closes the only issue found during the live V100.3.95 installed-app audit.

- `manifest.webmanifest` is served as `application/manifest+json; charset=utf-8` instead of the generic `application/octet-stream` fallback.
- The certified test starts the real application server against an isolated temporary database and verifies health, manifest parsing, maskable icon delivery, and the protected authentication boundary.
- V100.3.95 installed-app artwork, concise device naming, standalone behavior, and mask-safe presentation remain unchanged.
- No restaurant data, readiness evidence, authentication policy, operational workflow, or launch-control behavior is modified.
