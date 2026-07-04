import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

const listQuery = z.object({
  salonId: z.string(),
  active: z.coerce.boolean().optional(),
});

router.get("/", validate(listQuery, "query"), asyncHandler(async (req, res) => {
  const { salonId, active } = getValidated<z.infer<typeof listQuery>>(req);
  const staff = await prisma.staff.findMany({
    where: { salonId, ...(active !== undefined ? { active } : {}) },
    orderBy: { sortOrder: "asc" },
    include: {
      skills: true,
      availability: true,
      reviews: { take: 5, orderBy: { createdAt: "desc" } },
    },
  });
  res.json({ staff });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const staff = await prisma.staff.findUnique({
    where: { id: req.params.id },
    include: {
      availability: true,
      skills: { include: { service: true } },
      portfolio: { orderBy: { sort: "asc" } },
      reviews: { orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });
  if (!staff) throw new ApiError(404, "Staff not found");
  res.json({ staff });
}));

const createSchema = z.object({
  salonId: z.string(),
  userId: z.string().optional(),
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(100),
  bio: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  commissionPct: z.number().int().min(0).max(100).optional(),
  hireDate: z.string().datetime().optional(),
  sortOrder: z.number().int().optional(),
});

router.post("/", requireRole("OWNER", "ADMIN", "MANAGER"), validate(createSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof createSchema>>(req);
  const staff = await prisma.staff.create({
    data: {
      salonId: data.salonId,
      userId: data.userId,
      name: data.name,
      title: data.title,
      bio: data.bio,
      email: data.email,
      phone: data.phone,
      avatarUrl: data.avatarUrl,
      commissionPct: data.commissionPct ?? 0,
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  res.status(201).json({ staff });
}));

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  title: z.string().min(1).max(100).optional(),
  bio: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  active: z.boolean().optional(),
  commissionPct: z.number().int().min(0).max(100).optional(),
  hireDate: z.string().datetime().optional(),
  sortOrder: z.number().int().optional(),
});

router.put("/:id", requireRole("OWNER", "ADMIN", "MANAGER"), validate(updateSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof updateSchema>>(req);
  const staff = await prisma.staff.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.hireDate ? { hireDate: new Date(data.hireDate) } : {}),
    },
  });
  res.json({ staff });
}));

router.delete("/:id", requireRole("OWNER", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  const staff = await prisma.staff.update({
    where: { id: req.params.id },
    data: { active: false },
  });
  res.json({ staff });
}));

router.get("/:id/availability", asyncHandler(async (req, res) => {
  const availability = await prisma.staffAvailability.findMany({
    where: { staffId: req.params.id },
    orderBy: { dayOfWeek: "asc" },
  });
  res.json({ availability });
}));

const availabilitySchema = z.object({
  slots: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMin: z.number().int().min(0).max(1439),
    endMin: z.number().int().min(0).max(1439),
    active: z.boolean().optional(),
  })),
});

router.put("/:id/availability", requireRole("OWNER", "ADMIN", "MANAGER"), validate(availabilitySchema), asyncHandler(async (req, res) => {
  const { slots } = getValidated<z.infer<typeof availabilitySchema>>(req);
  await prisma.staffAvailability.deleteMany({ where: { staffId: req.params.id } });
  await prisma.staffAvailability.createMany({
    data: slots.map((s) => ({ staffId: req.params.id, ...s })),
  });
  const availability = await prisma.staffAvailability.findMany({
    where: { staffId: req.params.id },
    orderBy: { dayOfWeek: "asc" },
  });
  res.json({ availability });
}));

const scheduleQuery = z.object({
  from: z.string().datetime(),
  to: z.string().datetime().optional(),
});

router.get("/:id/schedule", validate(scheduleQuery, "query"), asyncHandler(async (req, res) => {
  const { from, to } = getValidated<z.infer<typeof scheduleQuery>>(req);
  const schedule = await prisma.staffSchedule.findMany({
    where: {
      staffId: req.params.id,
      date: { gte: new Date(from), ...(to ? { lte: new Date(to) } : {}) },
    },
    orderBy: { date: "asc" },
  });
  res.json({ schedule });
}));

const scheduleSchema = z.object({
  date: z.string().datetime(),
  startMin: z.number().int().min(0).max(1439),
  endMin: z.number().int().min(0).max(1439),
  note: z.string().optional(),
});

router.post("/:id/schedule", requireRole("OWNER", "ADMIN", "MANAGER"), validate(scheduleSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof scheduleSchema>>(req);
  const schedule = await prisma.staffSchedule.upsert({
    where: { staffId_date: { staffId: req.params.id, date: new Date(data.date) } },
    update: { startMin: data.startMin, endMin: data.endMin, note: data.note },
    create: { staffId: req.params.id, date: new Date(data.date), startMin: data.startMin, endMin: data.endMin, note: data.note },
  });
  res.json({ schedule });
}));

router.get("/:id/leave", asyncHandler(async (req, res) => {
  const leave = await prisma.staffLeave.findMany({
    where: { staffId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ leave });
}));

const leaveSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(1),
});

router.post("/:id/leave", requireRole("OWNER", "ADMIN", "MANAGER"), validate(leaveSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof leaveSchema>>(req);
  const leave = await prisma.staffLeave.create({
    data: {
      staffId: req.params.id,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason,
    },
  });
  res.status(201).json({ leave });
}));

const leaveActionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

router.put("/leave/:leaveId", requireRole("OWNER", "ADMIN", "MANAGER"), validate(leaveActionSchema), asyncHandler(async (req, res) => {
  const { status } = getValidated<z.infer<typeof leaveActionSchema>>(req);
  const leave = await prisma.staffLeave.update({
    where: { id: req.params.leaveId },
    data: { status, approvedBy: req.user!.id, reviewedAt: new Date() },
  });
  res.json({ leave });
}));

router.get("/:id/performance", asyncHandler(async (req, res) => {
  const performance = await prisma.staffPerformance.findMany({
    where: { staffId: req.params.id },
    orderBy: { periodStart: "desc" },
  });
  res.json({ performance });
}));

router.get("/:id/portfolio", asyncHandler(async (req, res) => {
  const portfolio = await prisma.staffPortfolio.findMany({
    where: { staffId: req.params.id },
    orderBy: { sort: "asc" },
  });
  res.json({ portfolio });
}));

const portfolioSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  imageUrl: z.string().url(),
  category: z.string().optional(),
  sort: z.number().int().optional(),
});

router.post("/:id/portfolio", requireRole("OWNER", "ADMIN", "MANAGER"), validate(portfolioSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof portfolioSchema>>(req);
  const item = await prisma.staffPortfolio.create({
    data: { staffId: req.params.id, ...data, sort: data.sort ?? 0 },
  });
  res.status(201).json({ item });
}));

router.delete("/portfolio/:itemId", requireRole("OWNER", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  await prisma.staffPortfolio.delete({ where: { id: req.params.itemId } });
  res.json({ ok: true });
}));

router.get("/:id/attendance", asyncHandler(async (req, res) => {
  const attendance = await prisma.staffAttendance.findMany({
    where: { staffId: req.params.id },
    orderBy: { date: "desc" },
  });
  res.json({ attendance });
}));

const attendanceSchema = z.object({
  date: z.string().datetime(),
  clockIn: z.string().datetime(),
  clockOut: z.string().datetime().optional(),
  status: z.string().optional(),
  note: z.string().optional(),
});

router.post("/:id/attendance", requireRole("OWNER", "ADMIN", "MANAGER"), validate(attendanceSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof attendanceSchema>>(req);
  const record = await prisma.staffAttendance.upsert({
    where: { staffId_date: { staffId: req.params.id, date: new Date(data.date) } },
    update: { clockIn: new Date(data.clockIn), clockOut: data.clockOut ? new Date(data.clockOut) : undefined, status: data.status, note: data.note },
    create: { staffId: req.params.id, date: new Date(data.date), clockIn: new Date(data.clockIn), clockOut: data.clockOut ? new Date(data.clockOut) : undefined, status: data.status ?? "PRESENT", note: data.note },
  });
  res.json({ record });
}));

router.get("/:id/reviews", asyncHandler(async (req, res) => {
  const reviews = await prisma.staffReview.findMany({
    where: { staffId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  res.json({ reviews });
}));

export default router;
