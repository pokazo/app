FROM node:22-bookworm-slim AS build
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
ARG VITE_API_URL=https://api.pokazo.ru
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @pokazo/web build

FROM nginx:1.27-alpine
COPY deploy/landing/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null \
  && wget -qO- http://127.0.0.1/robots.txt | grep -q Sitemap \
  || exit 1
