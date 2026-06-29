# ─── Stage 1: build the static assets with Vite ──────────────────
FROM --platform=linux/amd64 node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# In the container, the app calls "/api/..." and nginx proxies it to the
# backend service, so no VITE_API_URL is needed at build time.
RUN npm run build

# ─── Stage 2: serve with nginx ────────────────────────────────────
FROM --platform=linux/amd64 nginx:1.27-alpine

# SPA + API-proxy config.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Built assets from stage 1.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1/" >/dev/null 2>&1 || exit 1
