import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();
router.use(requireAuth);

router.get("/passport", asyncHandler(async (req, res) => {
  let passport = await prisma.beautyPassport.findUnique({ where: { userId: req.user!.id } });
  if (!passport) {
    passport = await prisma.beautyPassport.create({ data: { userId: req.user!.id } });
  }
  res.json({ passport });
}));

const updatePassportSchema = z.object({
  hairType: z.string().max(50).optional(),
  skinType: z.string().max(50).optional(),
  preferredStyle: z.string().max(100).optional(),
  favoriteService: z.string().max(100).optional(),
  preferredArea: z.string().max(100).optional(),
});

router.put("/passport", validate(updatePassportSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof updatePassportSchema>>(req);
  let passport = await prisma.beautyPassport.findUnique({ where: { userId: req.user!.id } });
  if (!passport) {
    passport = await prisma.beautyPassport.create({ data: { userId: req.user!.id, ...data } });
  } else {
    passport = await prisma.beautyPassport.update({ where: { userId: req.user!.id }, data });
  }
  res.json({ passport });
}));

const goalSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  targetDate: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" }),
  budget: z.number().int().min(0).optional(),
});

router.get("/goals", asyncHandler(async (req, res) => {
  const goals = await prisma.beautyGoal.findMany({
    where: { userId: req.user!.id },
    orderBy: { targetDate: "asc" },
    include: { timeline: { orderBy: { date: "asc" } } },
  });
  res.json({ goals });
}));

router.post("/goals", validate(goalSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof goalSchema>>(req);
  const goal = await prisma.beautyGoal.create({
    data: {
      userId: req.user!.id,
      title: data.title,
      description: data.description,
      targetDate: new Date(data.targetDate),
      budget: data.budget,
    },
  });
  res.status(201).json({ goal });
}));

const updateGoalSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  targetDate: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" }).optional(),
  budget: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
});

router.put("/goals/:id", validate(updateGoalSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.beautyGoal.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) throw new ApiError(404, "Goal not found");
  const data = getValidated<z.infer<typeof updateGoalSchema>>(req);
  const goal = await prisma.beautyGoal.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.targetDate ? { targetDate: new Date(data.targetDate) } : {}),
    },
  });
  res.json({ goal });
}));

router.delete("/goals/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.beautyGoal.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) throw new ApiError(404, "Goal not found");
  await prisma.beautyGoal.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

router.get("/timeline", asyncHandler(async (req, res) => {
  const where: any = { userId: req.user!.id };
  if (req.query.goalId) where.goalId = req.query.goalId as string;
  const entries = await prisma.beautyTimeline.findMany({
    where,
    orderBy: { date: "asc" },
    include: { goal: { select: { id: true, title: true } } },
  });
  res.json({ entries });
}));

const timelineSchema = z.object({
  goalId: z.string().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" }),
  type: z.enum(["BOOKING", "GOAL_STEP", "MILESTONE"]).default("GOAL_STEP"),
  bookingId: z.string().optional(),
});

router.post("/timeline", validate(timelineSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof timelineSchema>>(req);
  if (data.goalId) {
    const goal = await prisma.beautyGoal.findFirst({ where: { id: data.goalId, userId: req.user!.id } });
    if (!goal) throw new ApiError(404, "Goal not found");
  }
  const entry = await prisma.beautyTimeline.create({
    data: {
      userId: req.user!.id,
      goalId: data.goalId,
      title: data.title,
      description: data.description,
      date: new Date(data.date),
      type: data.type,
      bookingId: data.bookingId,
    },
  });
  res.status(201).json({ entry });
}));

const updateTimelineSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(500).optional(),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" }).optional(),
  type: z.enum(["BOOKING", "GOAL_STEP", "MILESTONE"]).optional(),
  completed: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

router.put("/timeline/:id", validate(updateTimelineSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.beautyTimeline.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) throw new ApiError(404, "Timeline entry not found");
  const data = getValidated<z.infer<typeof updateTimelineSchema>>(req);
  const entry = await prisma.beautyTimeline.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
    },
  });
  res.json({ entry });
}));

router.delete("/timeline/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.beautyTimeline.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) throw new ApiError(404, "Timeline entry not found");
  await prisma.beautyTimeline.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

const goalTimelineSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" }),
  type: z.enum(["BOOKING", "GOAL_STEP", "MILESTONE"]).default("GOAL_STEP"),
});

router.post("/goals/:id/timeline", validate(goalTimelineSchema), asyncHandler(async (req, res) => {
  const goal = await prisma.beautyGoal.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!goal) throw new ApiError(404, "Goal not found");
  const data = getValidated<z.infer<typeof goalTimelineSchema>>(req);
  const entry = await prisma.beautyTimeline.create({
    data: {
      userId: req.user!.id,
      goalId: req.params.id,
      title: data.title,
      description: data.description,
      date: new Date(data.date),
      type: data.type,
    },
  });
  res.status(201).json({ entry });
}));

export default router;
