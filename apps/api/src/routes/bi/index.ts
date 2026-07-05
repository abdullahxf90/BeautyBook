import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../../utils/http";
import { requireAuth, requireRole } from "../../middleware/auth";
import { z } from "zod";
import { getValidated, validate } from "../../middleware/validate";
import {
  getCustomerAnalytics,
  getSalonAnalytics,
  getCityAnalytics,
  getRevenueAnalytics,
  getMarketingAnalytics,
  calculateLTV,
  computeDailyStats,
  getRevenueForecast,
} from "../../lib/analytics";

import dashboardRoutes from "./dashboards";
import forecastRoutes from "./forecasts";
import abTestRoutes from "./abtesting";
import cohortRoutes from "./cohorts";
import reportRoutes from "./reports";
import funnelRoutes from "./funnels";
import realtimeRoutes from "./realtime";

const router = Router();
router.use(requireAuth);

// Sub-routes
router.use("/dashboards", dashboardRoutes);
router.use("/forecasts", forecastRoutes);
router.use("/ab-tests", abTestRoutes);
router.use("/cohorts", cohortRoutes);
router.use("/reports", reportRoutes);
router.use("/funnels", funnelRoutes);
router.use("/realtime", realtimeRoutes);

// ── Customer Analytics ──────────────────────────

router.get("/customers", asyncHandler(async (req, res) => {
  const { salonId, period } = req.query as { salonId?: string; period?: string };
  const data = await getCustomerAnalytics(salonId, period || "30d");
  res.json(data);
}));

router.get("/customers/:userId/ltv", asyncHandler(async (req, res) => {
  const ltv = await calculateLTV(req.params.userId);
  res.json(ltv);
}));

router.get("/customers/segments", asyncHandler(async (req, res) => {
  const segments = await prisma.userMetric.groupBy({
    by: ["segment"],
    _count: { userId: true },
    _sum: { totalSpent: true },
    _avg: { totalBookings: true, avgBookingValue: true },
    orderBy: { _count: { userId: "desc" } },
  });
  res.json({
    segments: segments.map((s) => ({
      segment: s.segment,
      count: s._count.userId,
      totalRevenue: s._sum.totalSpent ?? 0,
      avgBookings: Math.round((s._avg.totalBookings ?? 0) * 10) / 10,
      avgValue: Math.round(s._avg.avgBookingValue ?? 0),
    })),
  });
}));

// ── Salon Analytics ─────────────────────────────

router.get("/salons/:salonId", asyncHandler(async (req, res) => {
  const { period } = req.query as { period?: string };
  const data = await getSalonAnalytics(req.params.salonId, period || "30d");
  res.json(data);
}));

router.get("/salons/compare", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const ids = (req.query.ids as string || "").split(",").filter(Boolean);
  if (ids.length === 0) throw new ApiError(400, "Provide salon ids");
  const { period } = req.query as { period?: string };
  const results = await Promise.all(ids.map(async (id) => {
    const salon = await prisma.salon.findUnique({ where: { id }, select: { id: true, name: true } });
    const analytics = salon ? await getSalonAnalytics(id, period || "30d") : null;
    return { ...salon, analytics };
  }));
  res.json({ comparison: results });
}));

router.get("/salons/top", asyncHandler(async (req, res) => {
  const { period, limit: l } = req.query as { period?: string; limit?: string };
  const take = Math.min(parseInt(l || "10"), 50);
  const salons = await prisma.salonMetric.findMany({
    orderBy: { totalRevenue: "desc" },
    take,
    include: { salon: { select: { id: true, name: true, slug: true, rating: true } } },
  });
  res.json({ topSalons: salons.map((s) => ({ id: s.salonId, name: s.salon?.name, slug: s.salon?.slug, revenue: s.totalRevenue, bookings: s.totalBookings, rating: s.salon?.rating ?? s.avgRating })) });
}));

// ── City Analytics ──────────────────────────────

router.get("/cities", asyncHandler(async (req, res) => {
  const { period } = req.query as { period?: string };
  const data = await getCityAnalytics(period || "30d");
  res.json({ cities: data });
}));

// ── Revenue Analytics ───────────────────────────

router.get("/revenue", asyncHandler(async (req, res) => {
  const { salonId, period } = req.query as { salonId?: string; period?: string };
  const data = await getRevenueAnalytics(salonId, period || "30d");
  res.json(data);
}));

router.get("/revenue/forecast", asyncHandler(async (req, res) => {
  const { salonId, months } = req.query as { salonId?: string; months?: string };
  const data = await getRevenueForecast(salonId, parseInt(months || "3"));
  res.json(data);
}));

// ── Marketing Analytics ─────────────────────────

router.get("/marketing", asyncHandler(async (req, res) => {
  const { period } = req.query as { period?: string };
  const data = await getMarketingAnalytics(period || "30d");
  res.json(data);
}));

router.get("/marketing/channels", asyncHandler(async (req, res) => {
  const { period } = req.query as { period?: string };
  const { start, end } = periodRange(period || "30d");
  const channels = await prisma.marketingMetric.groupBy({
    by: ["channel"],
    where: { date: { gte: start, lte: end } },
    _sum: { sent: true, opened: true, clicked: true, converted: true, revenue: true, cost: true },
    orderBy: { _sum: { sent: "desc" } },
  });
  res.json({
    channels: channels.map((c) => ({
      channel: c.channel,
      sent: c._sum.sent ?? 0,
      opened: c._sum.opened ?? 0,
      clicked: c._sum.clicked ?? 0,
      converted: c._sum.converted ?? 0,
      revenue: c._sum.revenue ?? 0,
      cost: c._sum.cost ?? 0,
      roi: (c._sum.cost ?? 0) > 0 ? Math.round(((c._sum.revenue ?? 0) / (c._sum.cost ?? 0)) * 100) / 100 : 0,
    })),
  });
}));

// ── Aggregation ─────────────────────────────────

router.post("/aggregate/daily", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const now = new Date();
  await computeDailyStats(now);
  res.json({ success: true, date: now.toISOString().slice(0, 10) });
}));

router.post("/aggregate/metrics", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const { computeUserMetrics, computeSalonMetrics } = await import("../../lib/analytics");
  await Promise.all([computeUserMetrics(), computeSalonMetrics()]);
  res.json({ success: true });
}));

// ── Events ──────────────────────────────────────

const eventSchema = z.object({
  event: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  label: z.string().max(100).optional(),
  value: z.number().optional(),
  salonId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

router.post("/events", validate(eventSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof eventSchema>>(req);
  const { trackEvent } = await import("../../lib/analytics");
  await trackEvent({
    userId: req.user!.id,
    salonId: data.salonId,
    event: data.event,
    category: data.category,
    label: data.label,
    value: data.value,
    metadata: data.metadata,
    ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip,
    userAgent: req.headers["user-agent"] as string,
  });
  res.status(201).json({ success: true });
}));

router.get("/events", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const { event, salonId, limit: l } = req.query as Record<string, string>;
  const take = Math.min(parseInt(l || "100"), 1000);
  const where: Record<string, unknown> = {};
  if (event) where.event = event;
  if (salonId) where.salonId = salonId;
  const events = await prisma.analyticsEvent.findMany({
    where: where as any,
    orderBy: { createdAt: "desc" },
    take,
  });
  res.json({ events, total: events.length });
}));

// ── Dashboard Summary ───────────────────────────

router.get("/summary", asyncHandler(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalUsers, totalSalons, totalBookings, totalRevenue, todayBookings, monthBookings, activeSalons, avgRating, pendingBookings] = await Promise.all([
    prisma.user.count({ where: { status: { not: "DELETED" } } }),
    prisma.salon.count(),
    prisma.booking.count(),
    prisma.booking.aggregate({ _sum: { total: true } }),
    prisma.booking.count({ where: { startAt: { gte: todayStart } } }),
    prisma.booking.count({ where: { startAt: { gte: monthStart } } }),
    prisma.salon.count({ where: { verified: true } }),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
  ]);

  res.json({
    summary: {
      totalUsers, totalSalons, totalBookings,
      totalRevenue: totalRevenue._sum.total ?? 0,
      todayBookings, monthBookings,
      activeSalons, pendingBookings,
      avgRating: Math.round((avgRating._avg.rating ?? 0) * 10) / 10,
    },
  });
}));

function periodRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "7d": start.setDate(start.getDate() - 7); break;
    case "30d": start.setMonth(start.getMonth() - 1); break;
    case "90d": start.setMonth(start.getMonth() - 3); break;
    case "1y": start.setFullYear(start.getFullYear() - 1); break;
  }
  return { start, end };
}

import { ApiError } from "../../utils/http";

export default router;
