import { discoverService, logger } from "@emoji-social/shared";
import type { ServiceInstance } from "@emoji-social/shared";
import axios, { type AxiosResponse } from "axios";
import { env } from "./env.js";

export async function callService(
  serviceName: string,
  method: string,
  path: string,
  opts: { data?: unknown; headers?: Record<string, string> } = {},
): Promise<AxiosResponse> {
  const instance: ServiceInstance = await discoverService(serviceName);
  const url = `http://${instance.address}:${instance.port}${path}`;
  logger.info(`Proxy: ${method.toUpperCase()} ${url}`);

  return axios({ method, url, data: opts.data, headers: opts.headers, timeout: env.REQUEST_TIMEOUT });
}
