import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../../utils/http";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hourAgo = new Date(now.getTime() - 3600000);

  const [todayBookings, todayRevenue, activeUsers, recentSearches, recentErrors, recentNotifications, pendingBookings] = await Promise.all([
    prisma.booking.count({ where: { startAt: { gte: todayStart } } }),
    prisma.booking.aggregate({ where: { startAt: { gte: todayStart } }, _sum: { total: true } }),
    prisma.user.count({ where: { lastLoginAt: { gte: new Date(now.getTime() - 15 * 60000) } } }),
    prisma.analyticsEvent.count({ where: { event: "search", createdAt: { gte: hourAgo } } }),
    prisma.analyticsEvent.count({ where: { event: "error", createdAt: { gte: hourAgo } } }),
    prisma.analyticsEvent.count({ where: { event: "notification_sent", createdAt: { gte: fiveMinAgo } } }),
    prisma.booking.count({ where: { status: "PENDING", startAt: { gte: now } } }),
  ]);

  res.json({
    realtime: {
      todayBookings,
      todayRevenue: todayRevenue._sum.total ?? 0,
      activeUsers,
      searchesLastHour: recentSearches,
      errorsLastHour: recentErrors,
      notificationsLast5Min: recentNotifications,
      pendingBookings,
      timestamp: now.toISOString(),
    },
  });
}));

router.get("/salon/:salonId", asyncHandler(async (req, res) => {
  const { salonId } = req.params;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [todayBookings, todayRevenue, upcomingBookings, onlineStaff] = await Promise.all([
    prisma.booking.count({ where: { salonId, startAt: { gte: todayStart } } }),
    prisma.booking.aggregate({ where: { salonId, startAt: { gte: todayStart } }, _sum: { total: true } }),
    prisma.booking.findMany({
      where: { salonId, startAt: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
      orderBy: { startAt: "asc" },
      take: 10,
      select: { id: true, code: true, startAt: true, status: true, user: { select: { name: true } }, items: { select: { name: true } } },
    }),
    prisma.staff.count({ where: { salonId, active: true } }),
  ]);

  res.json({
    realtime: {
      todayBookings,
      todayRevenue: todayRevenue._sum.total ?? 0,
      upcomingBookings,
      onlineStaff,
      timestamp: now.toISOString(),
    },
  });
}));

export default router;
