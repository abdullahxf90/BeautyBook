import { type Request, type Response, type NextFunction } from "express";
import { trackEvent } from "../lib/analytics";
import { nanoid } from "nanoid";

const SESSION_COOKIE = "bb_session";

function getSessionId(req: Request): string {
  try {
    if (req.cookies && req.cookies[SESSION_COOKIE]) return req.cookies[SESSION_COOKIE];
  } catch {}
  return nanoid(24);
}

export function eventTracker(req: Request, _res: Response, next: NextFunction) {
  const sessionId = getSessionId(req);
  (req as any).sessionId = sessionId;

  const userId = req.user?.id;
  const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
  const userAgent = req.headers["user-agent"] as string;

  (req as any).trackEvent = (event: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      userId,
      event,
      sessionId,
      ipAddress,
      userAgent,
      metadata,
    }).catch(() => {});
  };

  next();
}

export async function trackAction(
  req: Request,
  event: string,
  metadata?: Record<string, unknown>,
) {
  return trackEvent({
    userId: req.user?.id,
    event,
    sessionId: (req as any).sessionId,
    ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip,
    userAgent: req.headers["user-agent"] as string,
    metadata,
  });
}
