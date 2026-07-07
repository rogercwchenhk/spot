# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Root dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Client dependencies & build
COPY src/client/package.json src/client/package-lock.json ./src/client/
RUN cd src/client && npm ci
COPY src/client/ ./src/client/
RUN cd src/client && npm run build

# CLI dependencies
COPY src/cli/package.json src/cli/package-lock.json ./src/cli/
RUN cd src/cli && npm ci

# ── Production stage ─────────────────────────────────────────
FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/cli/node_modules ./src/cli/node_modules
COPY --from=builder /app/src/client/dist ./src/client/dist
COPY package.json ./
COPY src/server/ ./src/server/
COPY src/cli/ ./src/cli/
COPY supabase/ ./supabase/
COPY scripts/ ./scripts/

# Non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

EXPOSE 3200

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3200/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server/index.js"]
