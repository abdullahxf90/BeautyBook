import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/export/bookings", requireRole("OWNER", "ADMIN"), asyncHandler(async (req, res) => {
  const { salonId, startDate, endDate } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (salonId) where.salonId = salonId;
  if (startDate || endDate) {
    where.startAt = {};
    if (startDate) (where.startAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.startAt as Record<string, unknown>).lte = new Date(endDate);
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: {
      user: { select: { name: true, phone: true } },
      items: { select: { name: true } },
      staff: { select: { name: true } },
      payment: { select: { method: true } },
    },
  });

  const headers = ["Code", "Customer", "Phone", "Service", "Staff", "Date", "Time", "Status", "Total", "Payment"];
  const rows = bookings.map((b) => [
    b.code,
    b.user.name,
    b.user.phone ?? "",
    b.items.map((i) => i.name).join("; "),
    b.staff?.name ?? b.employeeId ?? "",
    b.startAt.toISOString().slice(0, 10),
    b.startAt.toISOString().slice(11, 16),
    b.status,
    b.total.toString(),
    b.payment?.method ?? "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=bookings.csv");
  res.send(csv);
}));

router.get("/export/revenue", requireRole("OWNER", "ADMIN"), asyncHandler(async (req, res) => {
  const { salonId, startDate, endDate } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { status: "COMPLETED" };
  if (salonId) where.salonId = salonId;
  if (startDate || endDate) {
    where.startAt = {};
    if (startDate) (where.startAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.startAt as Record<string, unknown>).lte = new Date(endDate);
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { startAt: "asc" },
    select: { startAt: true, total: true, items: { select: { price: true } }, employeeId: true },
  });

  const dailyMap = new Map<string, { bookings: number; revenue: number }>();
  for (const b of bookings) {
    const key = b.startAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(key) || { bookings: 0, revenue: 0 };
    entry.bookings++;
    entry.revenue += b.total;
    dailyMap.set(key, entry);
  }

  const headers = ["Date", "Bookings", "Revenue", "Avg Value", "Commission"];
  const rows = Array.from(dailyMap.entries()).map(([date, stats]) => [
    date,
    stats.bookings.toString(),
    stats.revenue.toString(),
    Math.round(stats.revenue / stats.bookings).toString(),
    "0",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=revenue.csv");
  res.send(csv);
}));

router.get("/export/staff-performance", requireRole("OWNER", "ADMIN"), asyncHandler(async (req, res) => {
  const { salonId, startDate, endDate } = req.query as Record<string, string>;

  const dateFilter: Record<string, unknown> = {};
  if (startDate || endDate) {
    dateFilter.startAt = {};
    if (startDate) (dateFilter.startAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (dateFilter.startAt as Record<string, unknown>).lte = new Date(endDate);
  }

  const staffWhere: Record<string, unknown> = {};
  if (salonId) staffWhere.salonId = salonId;

  const staffList = await prisma.staff.findMany({
    where: staffWhere,
    select: {
      id: true,
      name: true,
      bookings: {
        where: { ...dateFilter } as Record<string, unknown>,
        select: { total: true, status: true },
      },
      reviews: {
        where: { ...(dateFilter.startAt ? { createdAt: (dateFilter.startAt as Record<string, unknown>).gte ? { gte: (dateFilter.startAt as Record<string, unknown>).gte as Date, lte: (dateFilter.startAt as Record<string, unknown>).lte as Date } : {} } : {}) },
        select: { rating: true },
      },
    },
  });

  const headers = ["Staff Name", "Bookings", "Revenue", "Avg Rating", "Reviews", "No-Shows"];
  const rows = staffList.map((s) => {
    const completed = s.bookings.filter((b) => b.status === "COMPLETED");
    const noShows = s.bookings.filter((b) => b.status === "NO_SHOW").length;
    const revenue = completed.reduce((sum, b) => sum + b.total, 0);
    const avgRating = s.reviews.length ? (s.reviews.reduce((sum, r) => sum + r.rating, 0) / s.reviews.length).toFixed(1) : "0";
    return [
      s.name,
      s.bookings.length.toString(),
      revenue.toString(),
      avgRating,
      s.reviews.length.toString(),
      noShows.toString(),
    ];
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=staff-performance.csv");
  res.send(csv);
}));

export default router;
