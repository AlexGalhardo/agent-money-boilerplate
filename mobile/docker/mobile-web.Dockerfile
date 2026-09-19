# Expo **web** export of the mobile app, served as static files by nginx.
# Build context is the REPO ROOT (needs `mobile/` + `shared/` side by side, the
# same layout Metro's watchFolders expects).
#
#   docker build -f docker/mobile-web.Dockerfile -t op-web .
#
# NOTE: EXPO_PUBLIC_* are inlined into the bundle at build time. Changing them
# requires rebuilding this image (`docker compose build web`).

# ---------------------------------------------------------------------------
FROM oven/bun:1.2-alpine AS build
ENV CI=1 EXPO_NO_TELEMETRY=1
WORKDIR /app

COPY shared/package.json shared/bun.lock* ./shared/
COPY mobile/package.json mobile/bun.lock* ./mobile/
RUN cd shared && (bun install --frozen-lockfile || bun install)
RUN cd mobile && (bun install --frozen-lockfile || bun install)

COPY shared/ ./shared/
COPY mobile/ ./mobile/

ARG EXPO_PUBLIC_DATA_MODE=remote
ARG EXPO_PUBLIC_API_URL=http://localhost:8081/api
ARG EXPO_PUBLIC_API_VERSION=v1
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
ENV EXPO_PUBLIC_DATA_MODE=$EXPO_PUBLIC_DATA_MODE \
    EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
    EXPO_PUBLIC_API_VERSION=$EXPO_PUBLIC_API_VERSION \
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

WORKDIR /app/mobile
# If `expo export` ever misbehaves under Bun, swap the builder `FROM` line to
# `node:20-alpine` and this to `npx expo export ...` (keep a package-lock then).
RUN bunx expo export --platform web --output-dir dist

# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache wget
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/mobile/dist /usr/share/nginx/html
# nginx:alpine renders /etc/nginx/templates/*.template with envsubst on boot,
# so BACKEND_ORIGIN is injected at runtime (no rebuild to repoint the proxy).
ENV BACKEND_ORIGIN=http://backend:3333
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:80/healthz || exit 1
