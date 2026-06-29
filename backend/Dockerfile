# ─── Backend image: Node + Express API ───────────────────────────
FROM --platform=linux/amd64 node:22-alpine

# Tini for proper signal handling (clean shutdown of the Node process).
RUN apk add --no-cache tini

WORKDIR /app

# Install production dependencies first for better layer caching.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the source.
COPY . .

ENV NODE_ENV=production
# The app reads PORT from the environment; default to 5001 to match local dev.
ENV PORT=5001
EXPOSE 5001

# Basic container healthcheck against the /api/health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
