# Apply V100.3.48

Overlay this package, run `npm install`, `npm run check`, the V100.3.48 focused test, and `npm run certify:pilot`. Keep live database and environment files unstaged.

The hosted preflight command intentionally fails unless a complete production environment is supplied. Local development continues with `npm run pilot:lan`.
