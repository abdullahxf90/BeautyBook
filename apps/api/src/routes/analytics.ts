import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

const periodQuerySchema = z.object({
  salonId: z.string().optional(),
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
});

const dateRangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const monthRangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}$/),
});

const analyticsEventSchema = z.object({
  event: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  label: z.string().max(100).optional(),
  value: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  salonId: z.string().optional(),
});

function periodToDateRange(period: string): { start: Date; end: Date } {
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

router.get("/dashboard", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [
    totalUsers,
    totalSalons,
    totalBookings,
    totalRevenue,
    todayBookings,
    todayRevenue,
    monthBookings,
    monthRevenue,
    activeSalons,
    pendingSalons,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.salon.count(),
    prisma.booking.count(),
    prisma.booking.aggregate({ _sum: { total: true } }),
    prisma.booking.count({ where: { startAt: { gte: todayStart } } }),
    prisma.booking.aggregate({ where: { startAt: { gte: todayStart } }, _sum: { total: true } }),
    prisma.booking.count({ where: { startAt: { gte: monthStart } } }),
    prisma.booking.aggregate({ where: { startAt: { gte: monthStart } }, _sum: { total: true } }),
    prisma.salon.count(),
    prisma.salon.count(),
  ]);
  res.json({
    dashboard: {
      totalUsers,
      totalSalons,
      totalBookings,
      totalRevenue: totalRevenue._sum.total ?? 0,
      todayBookings,
      todayRevenue: todayRevenue._sum.total ?? 0,
      monthBookings,
      monthRevenue: monthRevenue._sum.total ?? 0,
      activeSalons,
      pendingSalons,
    },
  });
}));

router.get("/salon/:salonId", asyncHandler(async (req, res) => {
  const { salonId } = req.params;
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true, ownerId: true } });
  if (!salon) throw new ApiError(404, "Salon not found");
  if (salon.ownerId !== req.user!.id && req.user!.role !== "ADMIN") throw new ApiError(403, "Forbidden");
  const { period } = req.query as { period?: string };
  const { start, end } = periodToDateRange(period || "30d");
  const [totalBookings, totalRevenue, totalCustomers, bookings] = await Promise.all([
    prisma.booking.count({ where: { salonId, startAt: { gte: start, lte: end } } }),
    prisma.booking.aggregate({ where: { salonId, startAt: { gte: start, lte: end } }, _sum: { total: true } }),
    prisma.booking.groupBy({ by: ["userId"], where: { salonId }, _count: { userId: true } }),
    prisma.booking.findMany({
      where: { salonId, startAt: { gte: start, lte: end } },
      orderBy: { startAt: "asc" },
      select: { startAt: true, total: true, status: true },
    }),
  ]);
  res.json({
    salonAnalytics: {
      totalBookings,
      totalRevenue: totalRevenue._sum.total ?? 0,
      uniqueCustomers: totalCustomers.length,
      bookings,
    },
  });
}));

router.get("/daily", validate(dateRangeSchema, "query"), asyncHandler(async (req, res) => {
  const { start, end } = getValidated<z.infer<typeof dateRangeSchema>>(req);
  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() + 1);
  const bookings = await prisma.booking.findMany({
    where: { startAt: { gte: startDate, lte: endDate } },
    orderBy: { startAt: "asc" },
    select: { startAt: true, total: true, status: true },
  });
  const dailyMap = new Map<string, { bookings: number; revenue: number; completed: number }>();
  for (const b of bookings) {
    const key = b.startAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(key) || { bookings: 0, revenue: 0, completed: 0 };
    entry.bookings++;
    entry.revenue += b.total;
    if (b.status === "COMPLETED") entry.completed++;
    dailyMap.set(key, entry);
  }
  const daily = Array.from(dailyMap.entries()).map(([date, stats]) => ({ date, ...stats }));
  res.json({ daily });
}));

router.get("/monthly", validate(monthRangeSchema, "query"), asyncHandler(async (req, res) => {
  const { start, end } = getValidated<z.infer<typeof monthRangeSchema>>(req);
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const startDate = new Date(startYear, startMonth - 1, 1);
  const endDate = new Date(endYear, endMonth, 0, 23, 59, 59);
  const bookings = await prisma.booking.findMany({
    where: { startAt: { gte: startDate, lte: endDate } },
    select: { startAt: true, total: true, status: true },
  });
  const monthlyMap = new Map<string, { bookings: number; revenue: number; completed: number }>();
  for (const b of bookings) {
    const key = `${b.startAt.getFullYear()}-${String(b.startAt.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthlyMap.get(key) || { bookings: 0, revenue: 0, completed: 0 };
    entry.bookings++;
    entry.revenue += b.total;
    if (b.status === "COMPLETED") entry.completed++;
    monthlyMap.set(key, entry);
  }
  const monthly = Array.from(monthlyMap.entries()).map(([month, stats]) => ({ month, ...stats }));
  res.json({ monthly });
}));

router.get("/revenue", validate(periodQuerySchema, "query"), asyncHandler(async (req, res) => {
  const { salonId, period } = getValidated<z.infer<typeof periodQuerySchema>>(req);
  const { start, end } = periodToDateRange(period);
  const where: Record<string, unknown> = { startAt: { gte: start, lte: end } };
  if (salonId) where.salonId = salonId;
  const revenue = await prisma.booking.aggregate({
    where,
    _sum: { total: true, discount: true, subtotal: true },
    _avg: { total: true },
    _count: { total: true },
  });
  const byStatus = await prisma.booking.groupBy({
    by: ["status"],
    where,
    _sum: { total: true },
    _count: { total: true },
  });
  res.json({
    revenue: {
      total: revenue._sum.total ?? 0,
      subtotal: revenue._sum.subtotal ?? 0,
      discounts: revenue._sum.discount ?? 0,
      averageBooking: revenue._avg.total ?? 0,
      bookingCount: revenue._count.total,
      byStatus,
    },
  });
}));

router.get("/booking-stats", validate(periodQuerySchema, "query"), asyncHandler(async (req, res) => {
  const { salonId, period } = getValidated<z.infer<typeof periodQuerySchema>>(req);
  const { start, end } = periodToDateRange(period);
  const where: Record<string, unknown> = { startAt: { gte: start, lte: end } };
  if (salonId) where.salonId = salonId;
  const byStatus = await prisma.booking.groupBy({
    by: ["status"],
    where,
    _count: { total: true },
  });
  const total = byStatus.reduce((s, x) => s + x._count.total, 0);
  const cancelled = byStatus.find((s) => s.status === "CANCELLED");
  const completed = byStatus.find((s) => s.status === "COMPLETED");
  res.json({
    bookingStats: {
      total,
      byStatus,
      completionRate: total ? ((completed?._count.total ?? 0) / total * 100).toFixed(1) : "0",
      cancellationRate: total ? ((cancelled?._count.total ?? 0) / total * 100).toFixed(1) : "0",
    },
  });
}));

router.get("/customer-stats", validate(periodQuerySchema, "query"), asyncHandler(async (req, res) => {
  const { salonId, period } = getValidated<z.infer<typeof periodQuerySchema>>(req);
  const { start, end } = periodToDateRange(period);
  const where: Record<string, unknown> = { startAt: { gte: start, lte: end } };
  if (salonId) where.salonId = salonId;
  const bookingUsers = await prisma.booking.groupBy({
    by: ["userId"],
    where,
    _count: { total: true },
    _sum: { total: true },
  });
  const newWhere: Record<string, unknown> = {};
  if (salonId) newWhere.salonId = salonId;
  const newCustomers = await prisma.booking.groupBy({
    by: ["userId"],
    where: { ...newWhere, startAt: { gte: start, lte: end } },
    _count: { userId: true },
  });
  const totalCustomers = bookingUsers.length;
  const avgSpend = totalCustomers
    ? bookingUsers.reduce((s, x) => s + (x._sum.total ?? 0), 0) / totalCustomers
    : 0;
  const avgVisits = totalCustomers
    ? bookingUsers.reduce((s, x) => s + x._count.total, 0) / totalCustomers
    : 0;
  res.json({
    customerStats: {
      totalCustomers,
      newCustomers: newCustomers.length,
      avgSpend,
      avgVisits,
      repeatRate: totalCustomers > 1
        ? ((bookingUsers.filter((u) => u._count.total > 1).length / totalCustomers) * 100).toFixed(1)
        : "0",
    },
  });
}));

router.get("/popular-services", asyncHandler(async (req, res) => {
  const { salonId, limit } = req.query as { salonId?: string; limit?: string };
  const take = Math.min(parseInt(limit || "10", 10), 50);
  const where: Record<string, unknown> = {};
  if (salonId) where.salonId = salonId;
  const services = await prisma.bookingItem.groupBy({
    by: ["serviceId", "name"],
    where,
    _count: { serviceId: true },
    _sum: { price: true },
    orderBy: { _count: { serviceId: "desc" } },
    take,
  });
  res.json({ popularServices: services.map((s) => ({ id: s.serviceId, name: s.name, bookings: s._count.serviceId, revenue: s._sum.price ?? 0 })) });
}));

router.get("/popular-times", asyncHandler(async (req, res) => {
  const { salonId } = req.query as { salonId?: string };
  const where: Record<string, unknown> = {};
  if (salonId) where.salonId = salonId;
  const bookings = await prisma.booking.findMany({ where, select: { startAt: true } });
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<number, number> = {};
  for (const b of bookings) {
    const h = b.startAt.getHours();
    const d = b.startAt.getDay();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  }
  const peakHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count);
  const peakDays = Object.entries(dayCounts)
    .map(([day, count]) => ({ day: parseInt(day), count }))
    .sort((a, b) => b.count - a.count);
  res.json({ peakHours, peakDays });
}));

router.get("/conversion", asyncHandler(async (req, res) => {
  const { salonId } = req.query as { salonId?: string };
  const where: Record<string, unknown> = {};
  if (salonId) where.salonId = salonId;
  const totalViews = await prisma.analyticsEvent.count({
    where: { event: "salon_view", ...where },
  });
  const totalInquiries = await prisma.analyticsEvent.count({
    where: { event: "inquiry", ...where },
  });
  const totalBookings = await prisma.booking.count({ where: { ...where } });
  const totalCompleted = await prisma.booking.count({ where: { ...where, status: "COMPLETED" } });
  res.json({
    conversion: {
      views: totalViews,
      inquiries: totalInquiries,
      bookings: totalBookings,
      completed: totalCompleted,
      viewToInquiry: totalViews ? ((totalInquiries / totalViews) * 100).toFixed(1) : "0",
      inquiryToBooking: totalInquiries ? ((totalBookings / totalInquiries) * 100).toFixed(1) : "0",
      bookingToCompletion: totalBookings ? ((totalCompleted / totalBookings) * 100).toFixed(1) : "0",
      overall: totalViews ? ((totalCompleted / totalViews) * 100).toFixed(1) : "0",
    },
  });
}));

router.post("/events", validate(analyticsEventSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof analyticsEventSchema>>(req);
  const extraData: Record<string, unknown> = {};
  if (data.category) extraData.category = data.category;
  if (data.label) extraData.label = data.label;
  if (data.value !== undefined) extraData.value = data.value;
  if (data.metadata) extraData.metadata = data.metadata;
  const event = await prisma.analyticsEvent.create({
    data: {
      event: data.event,
      data: JSON.stringify(extraData),
      salonId: data.salonId,
    },
  });
  res.status(201).json({ event });
}));

export default router;
