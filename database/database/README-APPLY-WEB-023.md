# Apply WEB-023

## Replace
- `index.html`
- `styles.css`
- `js/site.js`
- `sitemap.xml`

## Add
- `product-demo.html`
- `WEBSITE-SAAS-UPGRADE-23.md`

## Git
```powershell
git add index.html product-demo.html styles.css js/site.js sitemap.xml WEBSITE-SAAS-UPGRADE-23.md
git commit -m "WEB-023 interactive product demo"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline
```
