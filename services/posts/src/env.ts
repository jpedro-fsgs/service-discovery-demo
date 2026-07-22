import { z } from "zod";

const schema = z.object({
  SERVICE_NAME: z.string().default("posts-service"),
  SERVICE_PORT: z.coerce.number().default(3002),
  CONSUL_HOST: z.string().default("consul"),
  CONSUL_PORT: z.coerce.number().default(8500),
  REDIS_HOST: z.string().default("redis"),
  REDIS_PORT: z.coerce.number().default(6379),
  JWT_SECRET: z.string().min(8).default("emoji-social-sd-2026"),
});

export const env = schema.parse(process.env);
