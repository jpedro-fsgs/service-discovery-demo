import { z } from "zod";

const schema = z.object({
  SERVICE_NAME: z.string().default("auth-service"),
  SERVICE_PORT: z.coerce.number().default(3001),
  CONSUL_HOST: z.string().default("consul"),
  CONSUL_PORT: z.coerce.number().default(8500),
  JWT_SECRET: z.string().min(8).default("emoji-social-sd-2026"),
});

export const env = schema.parse(process.env);
