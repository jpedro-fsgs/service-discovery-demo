import type { FastifyInstance } from "fastify";
import { logger } from "@emoji-social/shared";
import type { EmojiPost, FeedResponse } from "@emoji-social/shared";
import { redis } from "./redis.js";

const FEED_KEY = "emoji:feed";
const FEED_MAX = 50;

export async function postsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { emoji: string } }>("/posts", {
    preHandler: [app.authenticate],
    schema: {
      description: "Enviar emoji para o feed",
      tags: ["Posts"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["emoji"],
        properties: { emoji: { type: "string" } },
      },
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            post: {
              type: "object",
              properties: {
                userId: { type: "string" },
                emoji: { type: "string" },
                timestamp: { type: "string" },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request.user as { sub: string }).sub;
    const post: EmojiPost = {
      userId,
      emoji: request.body.emoji,
      timestamp: new Date().toISOString(),
    };

    await redis.lpush(FEED_KEY, JSON.stringify(post));
    await redis.ltrim(FEED_KEY, 0, FEED_MAX - 1);

    logger.info("Emoji recebido", { userId, emoji: post.emoji });
    return reply.code(201).send({ success: true, post });
  });

  app.get("/posts/feed", {
    preHandler: [app.authenticate],
    schema: {
      description: "Feed dos últimos 50 emojis",
      tags: ["Posts"],
      security: [{ bearerAuth: [] }],
    },
  }, async (): Promise<FeedResponse> => {
    const raw = await redis.lrange(FEED_KEY, 0, FEED_MAX - 1);
    const feed = raw.map((item) => JSON.parse(item) as EmojiPost);
    return { feed, total: feed.length };
  });
}
