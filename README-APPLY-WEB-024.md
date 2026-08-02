# Apply WEB-024

Replace:
- index.html
- platform.html
- developers.html
- integrations.html
- resources.html
- styles.css
- js/site.js
- sitemap.xml

Add:
- docs.html
- WEBSITE-SAAS-UPGRADE-24.md

Then run:
```powershell
git add index.html platform.html developers.html integrations.html resources.html docs.html styles.css js/site.js sitemap.xml WEBSITE-SAAS-UPGRADE-24.md
git commit -m "WEB-024 documentation portal"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
