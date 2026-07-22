type LogLevel = "INFO" | "WARN" | "ERROR";

const serviceName = process.env.SERVICE_NAME ?? "app";

function format(level: LogLevel, msg: string, meta?: object): string {
  const ts = new Date().toISOString();
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] [${level}] [${serviceName}] ${msg}${suffix}`;
}

export const logger = {
  info: (msg: string, meta?: object) => console.log(format("INFO", msg, meta)),
  warn: (msg: string, meta?: object) => console.warn(format("WARN", msg, meta)),
  error: (msg: string, meta?: object) => console.error(format("ERROR", msg, meta)),
} as const;
