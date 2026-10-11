# Build stage: installs dependencies. The compiler tools are only here in case
# better-sqlite3 has no prebuilt binary for this platform.
FROM node:24-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Run stage: just Node, the app, and its dependencies.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY package.json server.js instrument.js ./
COPY src ./src
COPY public ./public
EXPOSE 8080
CMD ["node", "server.js"]
