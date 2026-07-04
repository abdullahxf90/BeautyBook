import { Router } from "express";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";
import { getValidated, validate } from "../middleware/validate";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "SUPER_ADMIN"));

router.get("/stats", asyncHandler(async (_req, res) => {
  const [users, salons, bookings, revenue] = await Promise.all([
    prisma.user.count(),
    prisma.salon.count(),
    prisma.booking.count(),
    prisma.booking.aggregate({ _sum: { total: true } }),
  ]);
  const recentBookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" }, take: 10,
    include: { user: { select: { name: true } }, salon: { select: { name: true } } },
  });
  res.json({ stats: { users, salons, bookings, revenue: revenue._sum.total ?? 0 }, recentBookings });
}));

router.get("/users", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const q = (req.query.q as string) || "";
  const role = req.query.role as string;
  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }];
  if (role) where.role = role;
  const [total, users] = await Promise.all([
    prisma.user.count({ where: where as any }),
    prisma.user.findMany({
      where: where as any, orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
      select: { id: true, name: true, email: true, phone: true, role: true, emailVerified: true, loyaltyPoints: true, createdAt: true },
    }),
  ]);
  res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.patch("/users/:id/role", validate(z.object({ role: z.enum(["CUSTOMER", "OWNER", "STAFF", "RECEPTIONIST", "MANAGER", "ADMIN"]) })), asyncHandler(async (req, res) => {
  const { role } = getValidated<{ role: string }>(req);
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: role as any }, select: { id: true, name: true, email: true, role: true } });
  res.json({ user });
}));

router.get("/salons", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const q = (req.query.q as string) || "";
  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }];
  const [total, salons] = await Promise.all([
    prisma.salon.count({ where: where as any }),
    prisma.salon.findMany({
      where: where as any, orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
      include: { area: { include: { city: true } }, _count: { select: { bookings: true } } },
    }),
  ]);
  res.json({ salons, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.patch("/salons/:id/verify", asyncHandler(async (req, res) => {
  const salon = await prisma.salon.update({ where: { id: req.params.id }, data: { verified: true } });
  res.json({ salon });
}));

router.get("/bookings", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const [total, bookings] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit,
      include: { user: { select: { name: true } }, salon: { select: { name: true } }, items: true },
    }),
  ]);
  res.json({ bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.get("/payments", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const [total, payments] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit,
      include: { booking: { select: { code: true, salon: { select: { name: true } } } } },
    }),
  ]);
  res.json({ payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.get("/verifications", asyncHandler(async (req, res) => {
  const verifications = await prisma.businessVerification.findMany({
    where: { status: "PENDING" },
    include: { salon: { select: { name: true, slug: true, phone: true, owner: { select: { name: true, email: true } } } } },
    orderBy: { submittedAt: "desc" },
  });
  res.json({ verifications });
}));

router.post("/verifications/:id/approve", asyncHandler(async (req, res) => {
  const v = await prisma.businessVerification.update({
    where: { id: req.params.id }, data: { status: "APPROVED", reviewedAt: new Date(), reviewedBy: req.user!.id },
  });
  await prisma.salon.update({ where: { id: v.salonId }, data: { verified: true } });
  res.json({ verification: v });
}));

router.post("/verifications/:id/reject", validate(z.object({ reason: z.string().min(1) })), asyncHandler(async (req, res) => {
  const { reason } = getValidated<{ reason: string }>(req);
  const v = await prisma.businessVerification.update({
    where: { id: req.params.id }, data: { status: "REJECTED", rejectionReason: reason, reviewedAt: new Date(), reviewedBy: req.user!.id },
  });
  res.json({ verification: v });
}));

router.get("/audit-logs", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
  ]);
  res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

export default router;
