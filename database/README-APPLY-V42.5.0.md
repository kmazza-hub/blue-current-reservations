# Apply V42.5.0

Replace the changed client and server files and add the six V42.3–V42.5 modules. Restart with `npm run start`, then open `http://localhost:8787/?pack=live`.

Recommended test: load a valid POS sample, then intentionally remove `locationId` and ingest it to confirm the dead-letter queue captures the failure. Restore the field and use Replay. Refresh the Live Operations Bridge to confirm canonical events update the operating snapshot.
