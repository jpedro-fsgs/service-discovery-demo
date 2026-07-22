import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { logger } from "@emoji-social/shared";
import { env } from "./env.js";
import { frontendRoutes } from "./routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = Fastify({ logger: false });

const publicPath = existsSync(join(__dirname, "public"))
  ? join(__dirname, "public")
  : __dirname;

await app.register(fastifyStatic, {
  root: publicPath,
  prefix: "/",
});

app.addHook("onResponse", (req, reply, done) => {
  if (req.url.startsWith("/api/")) {
    logger.info(`${req.method} ${req.url} ${reply.statusCode} ${reply.elapsedTime.toFixed(0)}ms`);
  }
  done();
});

await app.register(frontendRoutes);

app.setErrorHandler((error, _req, reply) => {
  logger.error(error.message);
  reply.code(500).send({ error: "Erro interno", timestamp: new Date().toISOString() });
});

await app.listen({ port: env.PORT, host: "0.0.0.0" });
logger.info(`Frontend server rodando em http://0.0.0.0:${env.PORT}`);
