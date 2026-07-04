import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();
router.use(requireAuth, requireRole("OWNER", "ADMIN", "SUPER_ADMIN"));

function ownerSalonFilter(userId: string, role: string) {
  return role === "OWNER" ? { ownerId: userId } : {};
}

router.get("/salons", asyncHandler(async (req, res) => {
  const salons = await prisma.salon.findMany({
    where: ownerSalonFilter(req.user!.id, req.user!.role),
    include: { area: { include: { city: true } }, _count: { select: { bookings: true, reviews: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ salons });
}));

router.get("/salons/:id", asyncHandler(async (req, res) => {
  const salon = await prisma.salon.findFirst({
    where: { id: req.params.id, ...ownerSalonFilter(req.user!.id, req.user!.role) },
    include: {
      area: { include: { city: true } }, images: { orderBy: { sort: "asc" } },
      services: { where: { active: true }, include: { category: true } },
      employees: { where: { active: true } },
      workingHours: { orderBy: { dayOfWeek: "asc" } },
      policy: true, verification: true,
    },
  });
  if (!salon) throw new ApiError(404, "Salon not found");
  res.json({ salon });
}));

const updateSalonSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().min(10).max(2000).optional(),
  address: z.string().min(5).max(300).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.string().email().optional(),
  priceFrom: z.number().int().optional(),
  homeService: z.boolean().optional(),
  gender: z.enum(["MALE", "FEMALE", "UNISEX"]).optional(),
  tag: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

router.patch("/salons/:id", validate(updateSalonSchema), asyncHandler(async (req, res) => {
  const data = getValidated<Record<string, unknown>>(req);
  const salon = await prisma.salon.update({ where: { id: req.params.id }, data });
  res.json({ salon });
}));

// Services management
router.post("/salons/:id/services", validate(z.object({ categoryId: z.string(), name: z.string().min(2).max(100), description: z.string().max(500).optional(), price: z.number().int().min(1), durationMin: z.number().int().min(5) })), asyncHandler(async (req, res) => {
  const data = getValidated<any>(req);
  const service = await prisma.service.create({ data: { ...data, salonId: req.params.id } });
  res.status(201).json({ service });
}));

router.patch("/services/:id", validate(z.object({ name: z.string().min(2).max(100).optional(), description: z.string().max(500).optional(), price: z.number().int().min(1).optional(), durationMin: z.number().int().min(5).optional(), active: z.boolean().optional() })), asyncHandler(async (req, res) => {
  const data = getValidated<Record<string, unknown>>(req);
  const service = await prisma.service.update({ where: { id: req.params.id }, data });
  res.json({ service });
}));

router.delete("/services/:id", asyncHandler(async (req, res) => {
  await prisma.service.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ ok: true });
}));

// Employees
router.post("/salons/:id/employees", validate(z.object({ name: z.string().min(2).max(80), title: z.string().min(2).max(80) })), asyncHandler(async (req, res) => {
  const data = getValidated<any>(req);
  const employee = await prisma.employee.create({ data: { ...data, salonId: req.params.id } });
  res.status(201).json({ employee });
}));

router.patch("/employees/:id", validate(z.object({ name: z.string().min(2).max(80).optional(), title: z.string().min(2).max(80).optional(), active: z.boolean().optional() })), asyncHandler(async (req, res) => {
  const data = getValidated<Record<string, unknown>>(req);
  const employee = await prisma.employee.update({ where: { id: req.params.id }, data });
  res.json({ employee });
}));

router.delete("/employees/:id", asyncHandler(async (req, res) => {
  await prisma.employee.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ ok: true });
}));

// Working hours
const hoursSchema = z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), openMin: z.number().int().min(0).max(1440), closeMin: z.number().int().min(0).max(1440), closed: z.boolean().default(false) }));

router.put("/salons/:id/hours", validate(hoursSchema), asyncHandler(async (req, res) => {
  const data = getValidated<Array<{ dayOfWeek: number; openMin: number; closeMin: number; closed: boolean }>>(req);
  await prisma.workingHour.deleteMany({ where: { salonId: req.params.id } });
  await prisma.workingHour.createMany({ data: data.map(h => ({ ...h, salonId: req.params.id })) });
  const hours = await prisma.workingHour.findMany({ where: { salonId: req.params.id }, orderBy: { dayOfWeek: "asc" } });
  res.json({ workingHours: hours });
}));

// Policy
router.put("/salons/:id/policy", validate(z.object({ cancellationMin: z.number().int().default(120), cancellationFee: z.number().int().default(0), refundPolicy: z.string().default("Full refund if cancelled 2h before"), latePolicy: z.string().default("15 min grace period"), notes: z.string().optional() })), asyncHandler(async (req, res) => {
  const data = getValidated<any>(req);
  const policy = await prisma.salonPolicy.upsert({ where: { salonId: req.params.id }, update: data, create: { ...data, salonId: req.params.id } });
  res.json({ policy });
}));

// Verification submit
const verificationSchema = z.object({
  cnicNumber: z.string().min(13).max(15).optional(),
  cnicFrontUrl: z.string().optional(),
  cnicBackUrl: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseUrl: z.string().optional(),
  taxNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  jazzcashNumber: z.string().optional(),
  easypaisaNumber: z.string().optional(),
});

router.put("/salons/:id/verification", validate(verificationSchema), asyncHandler(async (req, res) => {
  const data = getValidated<Record<string, unknown>>(req);
  const verification = await prisma.businessVerification.upsert({ where: { salonId: req.params.id }, update: { ...data, status: "PENDING" }, create: { ...data, salonId: req.params.id } });
  res.json({ verification });
}));

// Bookings for owner's salons
router.get("/bookings", asyncHandler(async (req, res) => {
  const salons = await prisma.salon.findMany({ where: ownerSalonFilter(req.user!.id, req.user!.role), select: { id: true } });
  const salonIds = salons.map(s => s.id);
  const status = req.query.status as string;
  const where: Record<string, unknown> = { salonId: { in: salonIds } };
  if (status) where.status = status;
  const bookings = await prisma.booking.findMany({
    where: where as any, orderBy: { startAt: "desc" },
    include: { user: { select: { name: true, phone: true } }, items: true, salon: { select: { name: true } } },
  });
  res.json({ bookings });
}));

// Analytics for owner's salons
router.get("/analytics", asyncHandler(async (req, res) => {
  const salons = await prisma.salon.findMany({ where: ownerSalonFilter(req.user!.id, req.user!.role), select: { id: true, name: true } });
  const salonIds = salons.map(s => s.id);
  const [totalBookings, completedBookings, cancelledBookings, revenueAgg, totalReviews] = await Promise.all([
    prisma.booking.count({ where: { salonId: { in: salonIds } } }),
    prisma.booking.count({ where: { salonId: { in: salonIds }, status: "COMPLETED" } }),
    prisma.booking.count({ where: { salonId: { in: salonIds }, status: "CANCELLED" } }),
    prisma.booking.aggregate({ where: { salonId: { in: salonIds }, status: "COMPLETED" }, _sum: { total: true } }),
    prisma.review.count({ where: { salonId: { in: salonIds } } }),
  ]);
  const bookingsByDay = await prisma.booking.groupBy({
    by: ["startAt"], where: { salonId: { in: salonIds }, startAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    _count: true, orderBy: { startAt: "asc" },
  });
  res.json({
    analytics: { totalBookings, completedBookings, cancelledBookings, revenue: revenueAgg._sum.total ?? 0, totalReviews },
    salons: salons.map(s => ({ name: s.name })),
    bookingsByDay: bookingsByDay.map(b => ({ date: b.startAt.toISOString().split("T")[0], count: b._count })),
  });
}));

export default router;
