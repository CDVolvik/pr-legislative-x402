# Multi-stage build for the HTTP API. (Vercel users don't need this — it's for
# a VPS / container / your own box when selling compute-heavy variants.)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json tsup.config.ts ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4021
CMD ["node", "dist/server/index.js"]
