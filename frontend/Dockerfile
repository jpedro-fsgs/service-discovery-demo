FROM node:22-alpine AS builder
WORKDIR /build
COPY package.json ./
COPY packages/shared/ ./packages/shared/
COPY frontend/package.json ./frontend/
COPY frontend/src/ ./frontend/src/
COPY frontend/tsconfig.json frontend/tsup.config.ts ./frontend/
RUN npm install --include=dev
WORKDIR /build/frontend
RUN npx tsup

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /build/frontend/dist ./dist/
COPY --from=builder /build/node_modules ./node_modules/
COPY frontend/package.json ./
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
