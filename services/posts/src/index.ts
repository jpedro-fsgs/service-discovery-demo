import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { hostname } from "node:os";
import { logger, registerService, setupGracefulShutdown } from "@emoji-social/shared";
import type { HealthResponse } from "@emoji-social/shared";
import { env } from "./env.js";
import { postsRoutes } from "./routes.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const app = Fastify({ logger: false });

await app.register(fastifyJwt, { secret: env.JWT_SECRET });

app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    logger.warn("JWT inválido ou ausente", { url: request.url, error: (err as Error).message });
    reply.code(401).send({
      error: "Token inválido ou ausente",
      message: "Envie Authorization: Bearer <token>",
      timestamp: new Date().toISOString(),
    });
  }
});

await app.register(fastifySwagger, {
  openapi: {
    info: { title: "Posts Service", version: "1.0.0" },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
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

await app.register(postsRoutes);

app.setErrorHandler((error, _req, reply) => {
  logger.error(error.message, { stack: error.stack });
  reply.code(error.statusCode ?? 500).send({ error: error.message });
});

await app.listen({ port: env.SERVICE_PORT, host: "0.0.0.0" });
logger.info(`Posts rodando na porta ${env.SERVICE_PORT}`);

const serviceId = await registerService({
  name: env.SERVICE_NAME,
  host: hostname(),
  port: env.SERVICE_PORT,
});
setupGracefulShutdown(serviceId, app);
