# Blue Current V100.3.65 — Staff Observer Stability

V100.3.65 fixes the page freeze introduced by the V100.3.64 missed-punch readability enhancement. The observer previously watched the entire page and could repeatedly rewrite the same content it was observing.

The enhancement is now idempotent, updates text only when its value changes, and watches only the Workforce Intelligence section. All V100.3.64 Team, scheduling, Smart Fill, and punch-review improvements remain active.

The installer requires certified V100.3.64 and preserves the external runtime database byte-for-byte.
