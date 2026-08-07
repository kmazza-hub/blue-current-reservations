# Apply V42.11.0

Replace the client and server files included in this patch and add the six new V42.9–V42.11 modules.

Restart Blue Current:

```powershell
taskkill /F /IM node.exe
npm run start
```

Open:

```text
http://localhost:8787/?pack=live
```

Recommended validation order:
1. Ingest a canonical or provider-adapter event.
2. Refresh Source Checkpoints and confirm the source sequence advances.
3. Preview a 15-minute Replay Window.
4. Publish the replay and confirm it does not duplicate persistent events.
5. Refresh Reasoning Feed Gate and review `safeToReason`, evidence score, and blockers.
