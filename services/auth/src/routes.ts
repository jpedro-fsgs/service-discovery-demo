import type { FastifyInstance } from "fastify";
import { logger } from "@emoji-social/shared";
import type { AuthTokenResponse } from "@emoji-social/shared";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { userId: string } }>("/auth/token", {
    schema: {
      description: "Gera JWT para o usuário",
      tags: ["Auth"],
      body: {
        type: "object",
        required: ["userId"],
        properties: { userId: { type: "string" } },
      },
      response: {
        200: {
          type: "object",
          properties: {
            token: { type: "string" },
            userId: { type: "string" },
            expiresIn: { type: "string" },
          },
        },
      },
    },
  }, async (request) => {
    const { userId } = request.body;
    const token = app.jwt.sign({ sub: userId, role: "user" });
    logger.info("JWT gerado", { userId });
    return { token, userId, expiresIn: "2h" } satisfies AuthTokenResponse;
  });
}
