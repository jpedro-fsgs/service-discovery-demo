import type { FastifyInstance, FastifyReply } from "fastify";
import axios from "axios";
import { logger } from "@emoji-social/shared";
import { callService } from "./discovery.js";
import { env } from "./env.js";

function handleError(reply: FastifyReply, error: unknown, serviceName: string): FastifyReply {
  const err = error as Error & { code?: string; response?: { status: number; data: unknown } };
  const ts = new Date().toISOString();

  if (err.code === "SERVICE_UNAVAILABLE" || err.code === "DISCOVERY_FAILED") {
    logger.error(`"${serviceName}" indisponível`);
    return reply.code(503).send({
      error: `Serviço "${serviceName}" temporariamente indisponível`,
      timestamp: ts,
    });
  }
  if (err.code === "ECONNREFUSED" || err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
    return reply.code(504).send({ error: `Timeout: "${serviceName}"`, timestamp: ts });
  }
  if (err.response) {
    return reply.code(err.response.status).send(err.response.data);
  }
  return reply.code(500).send({ error: "Erro interno", timestamp: ts });
}

export async function frontendRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/auth/token", async (req, reply) => {
    try {
      const res = await callService("auth-service", "POST", "/auth/token", {
        data: req.body,
        headers: { "Content-Type": "application/json" },
      });
      return reply.send(res.data);
    } catch (e) { return handleError(reply, e, "auth-service"); }
  });

  app.post("/api/posts", async (req, reply) => {
    try {
      const res = await callService("posts-service", "POST", "/posts", {
        data: req.body,
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.authorization ?? "",
        },
      });
      return reply.code(res.status).send(res.data);
    } catch (e) { return handleError(reply, e, "posts-service"); }
  });

  app.get("/api/feed", async (req, reply) => {
    try {
      const res = await callService("posts-service", "GET", "/posts/feed", {
        headers: { Authorization: req.headers.authorization ?? "" },
      });
      return reply.send(res.data);
    } catch (e) { return handleError(reply, e, "posts-service"); }
  });

  app.get("/api/services", async (_req, reply) => {
    try {
      const url = `http://${env.CONSUL_HOST}:${env.CONSUL_PORT}/v1/agent/services`;
      const res = await axios.get(url, { timeout: 3_000 });
      return reply.send(res.data);
    } catch {
      return reply.code(503).send({ error: "Consul indisponível" });
    }
  });
}
