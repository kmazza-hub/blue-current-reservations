FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    BLUE_CURRENT_ENV=production \
    BLUE_CURRENT_PERSISTENCE_DRIVER=json \
    BLUE_CURRENT_DB=/var/lib/blue-current/blue-current.json \
    BLUE_CURRENT_MANAGED_BACKUPS=true \
    BLUE_CURRENT_BACKUP_INTERVAL_HOURS=6 \
    BLUE_CURRENT_BACKUP_RETENTION=28 \
    PORT=8787

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY . .
RUN node scripts/check-release-data.js && mkdir -p /var/lib/blue-current && chown -R node:node /var/lib/blue-current /app

USER node
VOLUME ["/var/lib/blue-current"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:8787/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node","scripts/hosted-start.js"]
