import Redis from "ioredis";
import { logger } from "@emoji-social/shared";
import { env } from "./env.js";

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => logger.info("Conectado ao Redis"));
redis.on("error", (err) => logger.error(`Redis: ${err.message}`));
