import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

export const audit = logger.child({ component: "audit" });

export function auditLog(
  data: Record<string, unknown>,
  action: string
): void {
  audit.info({ ...data, action }, action);
}
