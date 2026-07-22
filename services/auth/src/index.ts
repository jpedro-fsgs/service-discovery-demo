import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { hostname } from "node:os";
import { logger, registerService, setupGracefulShutdown } from "@emoji-social/shared";
import type { HealthResponse } from "@emoji-social/shared";
import { env } from "./env.js";
import { authRoutes } from "./routes.js";

const app = Fastify({ logger: false });

await app.register(fastifyJwt, { secret: env.JWT_SECRET, sign: { expiresIn: "2h" } });
await app.register(fastifySwagger, {
  openapi: { info: { title: "Auth Service", version: "1.0.0" } },
});
await app.register(fastifySwaggerUi, { routePrefix: "/api-docs" });

app.addHook("onResponse", (req, reply, done) => {
  logger.info(`${req.method} ${req.url} ${reply.statusCode} ${reply.elapsedTime.toFixed(0)}ms`);
  done();
});

app.get("/health", async (): Promise<HealthResponse> => ({
  status: "ok",
  service: env.SERVICE_NAME,
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

await app.register(authRoutes);

app.setErrorHandler((error, _req, reply) => {
  logger.error(error.message, { stack: error.stack });
  reply.code(error.statusCode ?? 500).send({ error: error.message });
});

await app.listen({ port: env.SERVICE_PORT, host: "0.0.0.0" });
logger.info(`Auth rodando na porta ${env.SERVICE_PORT}`);

const serviceId = await registerService({
  name: env.SERVICE_NAME,
  host: hostname(),
  port: env.SERVICE_PORT,
});
setupGracefulShutdown(serviceId, app);
