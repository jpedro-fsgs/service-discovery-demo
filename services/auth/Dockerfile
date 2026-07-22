FROM node:22-alpine AS builder
WORKDIR /build
COPY package.json ./
COPY packages/shared/ ./packages/shared/
COPY services/auth/package.json ./services/auth/
COPY services/auth/src/ ./services/auth/src/
COPY services/auth/tsconfig.json services/auth/tsup.config.ts ./services/auth/
RUN npm install --include=dev
WORKDIR /build/services/auth
RUN npx tsup

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /build/services/auth/dist ./dist/
COPY --from=builder /build/node_modules ./node_modules/
COPY services/auth/package.json ./
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
