import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../../utils/http";
import { requireRole } from "../../middleware/auth";

const router = Router();
router.use(requireRole("ADMIN", "SUPER_ADMIN"));

function monthStart(offset: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - offset, 1);
}

router.get("/", asyncHandler(async (_req, res) => {
  const thisMonth = monthStart(0);
  const lastMonth = monthStart(1);
  const yearAgo = monthStart(12);

  const [
    gmvAll,
    gmvThisMonth,
    gmvLastMonth,
    paidPayments,
    activeSubs,
    activeSalonSubs,
    usersThisMonth,
    usersLastMonth,
    totalCustomers,
    repeatCustomerGroups,
    completedBookings,
    refundedCount,
  ] = await Promise.all([
    prisma.booking.aggregate({ _sum: { total: true }, _count: true, where: { status: "COMPLETED" } }),
    prisma.booking.aggregate({ _sum: { total: true }, _count: true, where: { status: "COMPLETED", createdAt: { gte: thisMonth } } }),
    prisma.booking.aggregate({ _sum: { total: true }, _count: true, where: { status: "COMPLETED", createdAt: { gte: lastMonth, lt: thisMonth } } }),
    prisma.payment.aggregate({ _sum: { amount: true, fee: true }, where: { status: "PAID" } }),
    prisma.subscription.aggregate({ _sum: { price: true }, _count: true, where: { status: "ACTIVE" } }),
    prisma.salonSubscription.aggregate({ _sum: { price: true }, _count: true, where: { status: "ACTIVE", plan: { not: "FREE" } } }),
    prisma.user.count({ where: { createdAt: { gte: thisMonth }, role: "CUSTOMER" } }),
    prisma.user.count({ where: { createdAt: { gte: lastMonth, lt: thisMonth }, role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", status: "ACTIVE" } }),
    prisma.booking.groupBy({ by: ["userId"], _count: true, where: { status: "COMPLETED", createdAt: { gte: yearAgo } } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.payment.count({ where: { status: "REFUNDED" } }),
  ]);

  const mrr = (activeSubs._sum.price ?? 0) + (activeSalonSubs._sum.price ?? 0);
  const bookingCustomers = repeatCustomerGroups.length;
  const repeatCustomers = repeatCustomerGroups.filter((g) => g._count > 1).length;
  const gmv = gmvAll._sum.total ?? 0;
  const growth = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);

  res.json({
    gmv: { total: gmv, thisMonth: gmvThisMonth._sum.total ?? 0, lastMonth: gmvLastMonth._sum.total ?? 0, momGrowthPct: growth(gmvThisMonth._sum.total ?? 0, gmvLastMonth._sum.total ?? 0) },
    revenue: { paymentsCollected: paidPayments._sum.amount ?? 0, processingFees: paidPayments._sum.fee ?? 0, mrr, arr: mrr * 12, activeSubscriptions: activeSubs._count + activeSalonSubs._count },
    bookings: { completed: completedBookings, thisMonth: gmvThisMonth._count, lastMonth: gmvLastMonth._count, avgOrderValue: completedBookings > 0 ? Math.round(gmv / completedBookings) : 0, refunds: refundedCount },
    customers: { total: totalCustomers, newThisMonth: usersThisMonth, newLastMonth: usersLastMonth, momGrowthPct: growth(usersThisMonth, usersLastMonth), repeatRatePct: bookingCustomers > 0 ? Math.round((repeatCustomers / bookingCustomers) * 1000) / 10 : 0, ltv: bookingCustomers > 0 ? Math.round(gmv / bookingCustomers) : 0 },
    generatedAt: new Date().toISOString(),
  });
}));

router.get("/revenue-by-city", asyncHandler(async (_req, res) => {
  const rows = await prisma.$queryRaw<Array<{ city: string; revenue: bigint; bookings: bigint }>>`
    SELECT c."name" AS city, COALESCE(SUM(b."total"), 0) AS revenue, COUNT(b."id") AS bookings
    FROM "Booking" b
    JOIN "Salon" s ON s."id" = b."salonId"
    JOIN "Area" a ON a."id" = s."areaId"
    JOIN "City" c ON c."id" = a."cityId"
    WHERE b."status" = 'COMPLETED'
    GROUP BY c."name"
    ORDER BY revenue DESC
    LIMIT 20`;
  res.json({ cities: rows.map((r) => ({ city: r.city, revenue: Number(r.revenue), bookings: Number(r.bookings) })) });
}));

router.get("/monthly-series", asyncHandler(async (_req, res) => {
  const start = monthStart(11);
  const rows = await prisma.$queryRaw<Array<{ month: Date; revenue: bigint; bookings: bigint; new_users: bigint }>>`
    SELECT months.month,
      COALESCE((SELECT SUM(b."total") FROM "Booking" b WHERE b."status" = 'COMPLETED' AND date_trunc('month', b."createdAt") = months.month), 0) AS revenue,
      COALESCE((SELECT COUNT(*) FROM "Booking" b WHERE b."status" = 'COMPLETED' AND date_trunc('month', b."createdAt") = months.month), 0) AS bookings,
      COALESCE((SELECT COUNT(*) FROM "User" u WHERE u."role" = 'CUSTOMER' AND date_trunc('month', u."createdAt") = months.month), 0) AS new_users
    FROM generate_series(${start}::timestamp, now(), interval '1 month') AS months(month)
    ORDER BY months.month`;
  res.json({
    series: rows.map((r) => ({
      month: r.month.toISOString().slice(0, 7),
      revenue: Number(r.revenue),
      bookings: Number(r.bookings),
      newUsers: Number(r.new_users),
    })),
  });
}));

export default router;
