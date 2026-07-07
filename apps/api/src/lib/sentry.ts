import * as Sentry from "@sentry/node";
import { config } from "../config";

// Backend error tracking. Dormant until SENTRY_DSN is set — with no DSN,
// init is skipped and every helper below is a no-op, so nothing changes.
let enabled = false;

export function initSentry(): void {
  if (!config.sentryDsn || enabled) return;
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    tracesSampleRate: config.nodeEnv === "production" ? 0.1 : 1.0,
  });
  enabled = true;
}

export const sentryEnabled = (): boolean => enabled;

export { Sentry };
