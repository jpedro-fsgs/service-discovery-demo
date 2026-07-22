FROM node:22-alpine AS builder
WORKDIR /build
COPY package.json ./
COPY packages/shared/ ./packages/shared/
COPY services/posts/package.json ./services/posts/
COPY services/posts/src/ ./services/posts/src/
COPY services/posts/tsconfig.json services/posts/tsup.config.ts ./services/posts/
RUN npm install --include=dev
WORKDIR /build/services/posts
RUN npx tsup

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /build/services/posts/dist ./dist/
COPY --from=builder /build/node_modules ./node_modules/
COPY services/posts/package.json ./
ENV NODE_ENV=production
EXPOSE 3002
CMD ["node", "dist/index.js"]
