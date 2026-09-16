# Blue Current V100.3.73 — Render Runtime Marker Continuity

This forward-only hosted reliability release closes the disk-backed restart failure discovered during the first V100.3.72 Render deployment.

- Records Render's unique `RENDER_INSTANCE_ID` in the runtime database ownership marker.
- Treats markers from stopped or replaced Render instances as stale, even when Linux reuses a container PID.
- Preserves the existing PID-based single-writer protection for local Windows operation.
- Preserves V100.3.72 authenticated readiness continuity and the certified Render origin configuration.
- Does not package, overwrite, upload, or modify either runtime database.

Render documents that services with persistent disks stop the existing instance before starting its replacement, so a marker owned by a different Render instance cannot represent a concurrent disk writer.
