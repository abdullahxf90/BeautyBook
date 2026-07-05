import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../../utils/http";
import { requireRole } from "../../middleware/auth";

const router = Router();
router.use(requireRole("ADMIN", "SUPER_ADMIN"));

// Customers whose booking cadence has dropped — likely churn.
// Heuristic: compare bookings in the last 60 days vs the 60 days before that.
router.get("/churn-risk", asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
  const now = Date.now();
  const recentStart = new Date(now - 60 * 24 * 60 * 60 * 1000);
  const priorStart = new Date(now - 120 * 24 * 60 * 60 * 1000);
  const [prior, recent] = await Promise.all([
    prisma.booking.groupBy({
      by: ["userId"],
      _count: true,
      where: { createdAt: { gte: priorStart, lt: recentStart }, status: { notIn: ["CANCELLED"] } },
    }),
    prisma.booking.groupBy({
      by: ["userId"],
      _count: true,
      where: { createdAt: { gte: recentStart }, status: { notIn: ["CANCELLED"] } },
    }),
  ]);
  const recentByUser = new Map(recent.map((r) => [r.userId, r._count]));
  const atRisk = prior
    .map((p) => {
      const recentCount = recentByUser.get(p.userId) ?? 0;
      const drop = p._count > 0 ? (p._count - recentCount) / p._count : 0;
      return { userId: p.userId, priorBookings: p._count, recentBookings: recentCount, activityDrop: Math.round(drop * 100) / 100 };
    })
    .filter((r) => r.activityDrop > 0.5 && r.priorBookings >= 2)
    .sort((a, b) => b.activityDrop - a.activityDrop || b.priorBookings - a.priorBookings)
    .slice(0, limit);
  const users = await prisma.user.findMany({
    where: { id: { in: atRisk.map((r) => r.userId) }, status: "ACTIVE" },
    select: { id: true, name: true, email: true, loyaltyTier: true, lastLoginAt: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  res.json({
    churnRisk: atRisk
      .filter((r) => byId.has(r.userId))
      .map((r) => ({ ...r, user: byId.get(r.userId), suggestedAction: r.activityDrop >= 1 ? "win-back offer" : "re-engagement notification" })),
    window: { recentStart, priorStart },
  });
}));

// Upcoming confirmed bookings scored by the customer's historical no-show rate.
router.get("/no-show-risk", asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
  const upcoming = await prisma.booking.findMany({
    where: { status: { in: ["CONFIRMED", "PENDING"] }, startAt: { gte: new Date() } },
    select: { id: true, userId: true, startAt: true, total: true, salon: { select: { id: true, name: true } } },
    orderBy: { startAt: "asc" },
    take: 500,
  });
  const userIds = Array.from(new Set(upcoming.map((b) => b.userId)));
  const history = userIds.length
    ? await prisma.booking.groupBy({
        by: ["userId", "status"],
        _count: true,
        where: { userId: { in: userIds }, status: { in: ["COMPLETED", "NO_SHOW", "CANCELLED"] } },
      })
    : [];
  const stats = new Map<string, { completed: number; noShow: number; cancelled: number }>();
  for (const h of history) {
    const s = stats.get(h.userId) ?? { completed: 0, noShow: 0, cancelled: 0 };
    if (h.status === "COMPLETED") s.completed += h._count;
    if (h.status === "NO_SHOW") s.noShow += h._count;
    if (h.status === "CANCELLED") s.cancelled += h._count;
    stats.set(h.userId, s);
  }
  const scored = upcoming
    .map((b) => {
      const s = stats.get(b.userId) ?? { completed: 0, noShow: 0, cancelled: 0 };
      const past = s.completed + s.noShow + s.cancelled;
      // No history = mild uncertainty; otherwise weight no-shows heavily, cancellations lightly
      const risk = past === 0 ? 0.2 : Math.min(1, (s.noShow * 1.0 + s.cancelled * 0.3) / past);
      return { bookingId: b.id, startAt: b.startAt, total: b.total, salon: b.salon, userId: b.userId, riskScore: Math.round(risk * 100) / 100, history: s };
    })
    .filter((b) => b.riskScore >= 0.3)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);
  res.json({ noShowRisk: scored, evaluated: upcoming.length });
}));

export default router;
