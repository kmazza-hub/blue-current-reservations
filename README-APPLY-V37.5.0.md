# Apply Blue Current V37.5.0

Replace the four existing files and add the six module files plus release documentation.

After copying, stop Node and restart once:

```powershell
taskkill /F /IM node.exe
npm run start
```

Normal focused startup: `http://localhost:8787/`

Feature pack examples:
- `?pack=operations`
- `?pack=intelligence`
- `?pack=enterprise`
- `?pack=integrations`

Complete diagnostics: `?full=1`
