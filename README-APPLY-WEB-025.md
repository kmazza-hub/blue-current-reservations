# Apply WEB-025

Replace: index.html, docs.html, platform.html, solutions.html, styles.css, js/site.js, sitemap.xml.

Add: pilot-workspace.html and WEBSITE-SAAS-UPGRADE-25.md.

```powershell
git add index.html docs.html platform.html solutions.html pilot-workspace.html styles.css js/site.js sitemap.xml WEBSITE-SAAS-UPGRADE-25.md
git commit -m "WEB-025 pilot workspace"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
