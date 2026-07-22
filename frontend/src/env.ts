import { z } from "zod";

const schema = z.object({
  SERVICE_NAME: z.string().default("frontend"),
  PORT: z.coerce.number().default(8080),
  CONSUL_HOST: z.string().default("consul"),
  CONSUL_PORT: z.coerce.number().default(8500),
  REQUEST_TIMEOUT: z.coerce.number().default(5000),
});

export const env = schema.parse(process.env);
