import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { recordMetric } from "../lib/metrics";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("http", `${req.method} ${req.path} ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userId: (req as any).user?.id,
    });
    recordMetric("request_duration", duration, { method: req.method, path: req.path?.split("/")[2] || "root" });
    recordMetric("request_count", 1, { status: String(res.statusCode)[0] + "xx" });
  });
  next();
}
