# Farm Project — Astro SSR server image (Week 6 multi-stage build, Week 7 ECS).

# STAGE 1: install, build, then drop dev dependencies
FROM node:22-alpine AS builder
WORKDIR /app
# Dependencies first: this layer is cached while package*.json do not change.
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# STAGE 2: lean runtime with only what the server needs
FROM node:22-alpine AS runner
WORKDIR /app
# 12-Factor: configuration in the environment; 0.0.0.0 so the port is reachable outside the container.
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# The reports read the farm data at runtime (readiness probe checks it).
COPY --from=builder /app/farm-app/farmproject.sql ./farm-app/farmproject.sql

# Least privilege: do not run the server as root.
USER node

EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:4321/api/health/ready || exit 1

CMD ["node", "./dist/server/entry.mjs"]
