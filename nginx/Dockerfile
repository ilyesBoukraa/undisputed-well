# Build context is the repo root (see docker-compose.yml) so this stage can reach
# both frontend/ and nginx/. Node only builds the static assets and never runs in
# production — see PLAN.md architecture decision (React/Vite, no SSR).
FROM node:22-slim AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:1.27-alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
