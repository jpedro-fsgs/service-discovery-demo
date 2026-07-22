import axios from "axios";
import { logger } from "./logger.js";
import type { ServiceInstance, ServiceRegistration } from "./types.js";
import type { FastifyInstance } from "fastify";

const getConsulUrl = () => `http://${process.env.CONSUL_HOST ?? "consul"}:${process.env.CONSUL_PORT ?? "8500"}`;

export async function registerService(opts: ServiceRegistration): Promise<string> {
  const serviceId = opts.id ?? `${opts.name}-${opts.host}-${opts.port}`;

  await axios.put(`${getConsulUrl()}/v1/agent/service/register`, {
    ID: serviceId,
    Name: opts.name,
    Address: opts.host,
    Port: opts.port,
    Check: {
      Name: `${opts.name} health`,
      HTTP: `http://${opts.host}:${opts.port}/health`,
      Method: "GET",
      Interval: "10s",
      Timeout: "5s",
      DeregisterCriticalServiceAfter: "30s",
    },
  });

  logger.info(`Registrado no Consul`, { service: opts.name, address: `${opts.host}:${opts.port}` });
  return serviceId;
}

export async function deregisterService(serviceId: string): Promise<void> {
  try {
    await axios.put(`${getConsulUrl()}/v1/agent/service/deregister/${serviceId}`);
    logger.info(`Desregistrado do Consul`, { serviceId });
  } catch (err) {
    logger.error(`Falha ao desregistrar: ${(err as Error).message}`);
  }
}

export async function discoverService(serviceName: string): Promise<ServiceInstance> {
  const { data } = await axios.get<Array<{ Service: { Address: string; Port: number } }>>(
    `${getConsulUrl()}/v1/health/service/${serviceName}`,
    { params: { passing: true }, timeout: 3_000 }
  );

  if (!data || !data.length) {
    const err = new Error(`Serviço "${serviceName}" indisponível`) as Error & { code: string };
    err.code = "SERVICE_UNAVAILABLE";
    throw err;
  }

  const pick = data[Math.floor(Math.random() * data.length)]!;
  const instance: ServiceInstance = { address: pick.Service.Address, port: pick.Service.Port };
  logger.info(`"${serviceName}" descoberto`, instance);
  return instance;
}

export function setupGracefulShutdown(serviceId: string, fastify: FastifyInstance): void {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} recebido — graceful shutdown`);
    await deregisterService(serviceId);
    await fastify.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
