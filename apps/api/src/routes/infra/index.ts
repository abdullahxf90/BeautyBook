import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../../utils/http";
import { getRedis } from "../../lib/redis";
import { getMetrics, getMetricsSummary } from "../../lib/metrics";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();

router.get("/health", asyncHandler(async (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  checks.server = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    healthy = false;
  }

  try {
    const redis = await getRedis();
    if (redis) {
      await redis.ping();
      checks.redis = "ok";
    } else {
      checks.redis = "unavailable";
    }
  } catch {
    checks.redis = "error";
    healthy = false;
  }

  const status = healthy ? "healthy" : "degraded";
  res.status(healthy ? 200 : 503).json({
    status,
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
}));

router.get("/health/readiness", asyncHandler(async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
}));

router.get("/health/liveness", asyncHandler(async (_req, res) => {
  res.json({ status: "alive" });
}));

router.get("/metrics", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (_req, res) => {
  const range = parseInt(_req.query.range as string) || 3600000;
  const since = Date.now() - range;
  const summary = getMetricsSummary(since);
  const raw = getMetrics(since);
  res.json({ summary, rawCount: raw.length, range });
}));

router.get("/system", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (_req, res) => {
  const memory = process.memoryUsage();
  const [userCount, salonCount, bookingCount, paymentCount] = await Promise.all([
    prisma.user.count(),
    prisma.salon.count(),
    prisma.booking.count(),
    prisma.payment.count(),
  ]);
  res.json({
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      nodeVersion: process.version,
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
    },
    counts: { users: userCount, salons: salonCount, bookings: bookingCount, payments: paymentCount },
    timestamp: new Date().toISOString(),
  });
}));

router.get("/queue", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const redis = await getRedis();
  if (!redis) return res.json({ enabled: false, message: "Redis not available" });
  const [pending, delayed, dead] = await Promise.all([
    redis.llen("queue:jobs"),
    redis.zcard("queue:delayed"),
    redis.llen("queue:dead"),
  ]);
  res.json({ enabled: true, queues: { pending, delayed, dead } });
}));

// Public service status page (aggregated, no internals exposed)
router.get("/status", asyncHandler(async (_req, res) => {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  let database = "operational";
  let recentErrors = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    recentErrors = await prisma.systemLog.count({ where: { level: "ERROR", createdAt: { gte: hourAgo } } });
  } catch {
    database = "outage";
  }
  let cache = "operational";
  try {
    const redis = await getRedis();
    if (redis) await redis.ping();
    else cache = "unavailable";
  } catch {
    cache = "degraded";
  }
  const overall = database === "outage" ? "major_outage" : recentErrors > 50 ? "degraded" : "operational";
  res.json({
    status: overall,
    services: { api: "operational", database, cache },
    errorsLastHour: recentErrors,
    timestamp: new Date().toISOString(),
  });
}));

router.get("/errors", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const { module, since } = req.query;
  const where: Record<string, unknown> = { level: "ERROR" };
  if (module) where.module = module;
  if (since) where.createdAt = { gte: new Date(since as string) };
  const [total, errors, byModule] = await Promise.all([
    prisma.systemLog.count({ where: where as any }),
    prisma.systemLog.findMany({ where: where as any, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.systemLog.groupBy({ by: ["module"], _count: true, where: { level: "ERROR", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ]);
  res.json({ errors, byModule24h: byModule, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

export default router;
