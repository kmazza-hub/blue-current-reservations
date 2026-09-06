# Apply V100.3.49

Overlay this package, run `npm install`, `npm run check`, the V100.3.49 focused test, and `npm run certify:pilot`. Keep live database and environment files unstaged.

Do not run hosted provisioning against the local development database path. It is reserved for a fresh external hosted volume during controlled deployment.
