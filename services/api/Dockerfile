FROM node:24-alpine AS builder

WORKDIR /app

# Copy root and workspace definitions
COPY package*.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/api-client ./packages/api-client
COPY services/api ./services/api

# Install dependencies and build
RUN npm install
RUN npm run build --workspace=@teletrack/shared-types
RUN npm run build --workspace=@teletrack/api-client
RUN npm run build --workspace=@teletrack/api

# Production image
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/packages/api-client/dist ./packages/api-client/dist
COPY --from=builder /app/packages/api-client/package.json ./packages/api-client/
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/package.json ./services/api/

RUN npm install --omit=dev

EXPOSE 4000

CMD ["node", "services/api/dist/server.js"]
