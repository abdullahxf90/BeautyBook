import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../../utils/http";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getValidated, validate } from "../../middleware/validate";
import { trackEvent } from "../../lib/analytics";

const router = Router();
router.use(requireAuth);
router.use(requireRole("ADMIN", "SUPER_ADMIN"));

const createTestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["HOMEPAGE", "SEARCH_RANKING", "PRICING", "RECOMMENDATIONS", "NOTIFICATIONS", "PROMOTIONS", "LAYOUT"]),
  targetAudience: z.record(z.unknown()).optional(),
  minSampleSize: z.number().int().min(100).optional().default(1000),
  confidenceLevel: z.number().min(0.5).max(0.999).optional().default(0.95),
  variants: z.array(z.object({ name: z.string(), config: z.record(z.unknown()), trafficPct: z.number().min(1).max(100) })).min(2).max(10),
});

router.get("/", asyncHandler(async (req, res) => {
  const { status, type } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  const tests = await prisma.aBTest.findMany({
    where: where as any,
    orderBy: { createdAt: "desc" },
    include: { variants: true, _count: { select: { events: true } } },
  });
  res.json({ tests });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const test = await prisma.aBTest.findUnique({
    where: { id: req.params.id },
    include: {
      variants: { orderBy: { trafficPct: "desc" } },
      events: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!test) throw new ApiError(404, "Test not found");
  res.json({ test });
}));

router.post("/", validate(createTestSchema), asyncHandler(async (req, res) => {
  const { variants, ...data } = getValidated<z.infer<typeof createTestSchema>>(req);
  const test = await prisma.aBTest.create({
    data: {
      ...data,
      targetAudience: data.targetAudience ? JSON.stringify(data.targetAudience) : null,
      createdBy: req.user!.id,
      variants: { create: variants.map((v) => ({ name: v.name, config: JSON.stringify(v.config), trafficPct: v.trafficPct })) },
    },
    include: { variants: true },
  });
  res.status(201).json({ test });
}));

router.put("/:id", validate(createTestSchema.partial()), asyncHandler(async (req, res) => {
  const { variants, ...data } = getValidated<Partial<z.infer<typeof createTestSchema>>>(req);
  const updateData: Record<string, unknown> = { ...data };
  if (data.targetAudience) updateData.targetAudience = JSON.stringify(data.targetAudience);

  if (variants) {
    await prisma.aBTestVariant.deleteMany({ where: { testId: req.params.id } });
    await prisma.aBTestVariant.createMany({
      data: variants.map((v) => ({ testId: req.params.id, name: v.name, config: JSON.stringify(v.config), trafficPct: v.trafficPct })),
    });
  }

  const test = await prisma.aBTest.update({ where: { id: req.params.id }, data: updateData, include: { variants: true } });
  res.json({ test });
}));

router.post("/:id/start", asyncHandler(async (req, res) => {
  const test = await prisma.aBTest.update({
    where: { id: req.params.id },
    data: { status: "RUNNING", startedAt: new Date() },
    include: { variants: true },
  });
  res.json({ test });
}));

router.post("/:id/pause", asyncHandler(async (req, res) => {
  const test = await prisma.aBTest.update({
    where: { id: req.params.id },
    data: { status: "PAUSED" },
  });
  res.json({ test });
}));

router.post("/:id/complete", asyncHandler(async (req, res) => {
  const test = await prisma.aBTest.findUnique({
    where: { id: req.params.id },
    include: { variants: true },
  });
  if (!test) throw new ApiError(404, "Test not found");

  let winnerId: string | null = null;
  if (test.variants.length > 1) {
    const control = test.variants.find((v) => v.name === "CONTROL");
    const best = test.variants.reduce((a, b) => a.conversions > b.conversions ? a : b);
    if (best.conversions > (control?.conversions ?? 0)) {
      winnerId = best.id;
    }
  }

  const updated = await prisma.aBTest.update({
    where: { id: req.params.id },
    data: { status: "COMPLETED", endedAt: new Date(), winnerId },
    include: { variants: true },
  });
  res.json({ test: updated });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.aBTest.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

router.post("/:id/track", asyncHandler(async (req, res) => {
  const { variantId, event, value, metadata } = req.body as { variantId: string; event: string; value?: number; metadata?: Record<string, unknown> };

  const ev = await prisma.aBTestEvent.create({
    data: {
      testId: req.params.id,
      variantId,
      userId: req.user!.id,
      event,
      value: value ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  if (event === "CONVERSION") {
    await prisma.aBTestVariant.update({ where: { id: variantId }, data: { conversions: { increment: 1 } } });
  } else if (event === "REVENUE" && value) {
    await prisma.aBTestVariant.update({ where: { id: variantId }, data: { revenue: { increment: value } } });
  } else {
    await prisma.aBTestVariant.update({ where: { id: variantId }, data: { impressions: { increment: 1 } } });
  }

  await trackEvent({ userId: req.user!.id, event: `ab_test_${event}`, metadata: { testId: req.params.id, variantId } });

  res.status(201).json({ event: ev });
}));

export default router;
