import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

const campaignSchema = z.object({
  salonId: z.string(),
  name: z.string().min(1).max(100),
  type: z.enum(["EMAIL", "SMS", "PUSH", "SOCIAL", "OTHER"]),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).default("DRAFT"),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  budget: z.number().int().nonnegative().optional(),
});

const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["EMAIL", "SMS", "PUSH", "SOCIAL", "OTHER"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  budget: z.number().int().nonnegative().optional(),
});

const promotionSchema = z.object({
  salonId: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "BUY_GET", "FREEBIE"]),
  value: z.number().int().nonnegative(),
  minPurchase: z.number().int().nonnegative().default(0),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  active: z.boolean().default(true),
});

const promotionUpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "BUY_GET", "FREEBIE"]).optional(),
  value: z.number().int().nonnegative().optional(),
  minPurchase: z.number().int().nonnegative().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  active: z.boolean().optional(),
});

const offerSchema = z.object({
  salonId: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  originalPrice: z.number().int(),
  offerPrice: z.number().int(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  maxRedemptions: z.number().int().nonnegative().optional(),
  active: z.boolean().default(true),
});

const offerUpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  originalPrice: z.number().int().optional(),
  offerPrice: z.number().int().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  maxRedemptions: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

const discountSchema = z.object({
  salonId: z.string(),
  name: z.string().min(1).max(100),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().nonnegative(),
  minTotal: z.number().int().nonnegative().default(0),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
});

const discountUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["PERCENT", "FIXED"]).optional(),
  value: z.number().int().nonnegative().optional(),
  minTotal: z.number().int().nonnegative().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  active: z.boolean().optional(),
});

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]),
});

const campaignIncludes = {
  salon: { select: { id: true, name: true } },
} as const;

router.get("/campaigns", asyncHandler(async (req, res) => {
  const { salonId, status } = req.query as { salonId?: string; status?: string };
  const where: Record<string, unknown> = {};
  if (salonId) where.salonId = salonId;
  if (status) where.status = status;
  const campaigns = await prisma.campaign.findMany({ where, include: campaignIncludes, orderBy: { createdAt: "desc" } });
  res.json({ campaigns });
}));

router.post("/campaigns", validate(campaignSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof campaignSchema>>(req);
  const campaign = await prisma.campaign.create({
    data: {
      ...data,
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
    },
    include: campaignIncludes,
  });
  res.status(201).json({ campaign });
}));

router.put("/campaigns/:id", validate(campaignUpdateSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof campaignUpdateSchema>>(req);
  const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Campaign not found");
  const campaign = await prisma.campaign.update({
    where: { id: req.params.id },
    data: {
      ...data,
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
    },
    include: campaignIncludes,
  });
  res.json({ campaign });
}));

router.delete("/campaigns/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Campaign not found");
  await prisma.campaign.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

router.put("/campaigns/:id/status", validate(statusSchema), asyncHandler(async (req, res) => {
  const { status } = getValidated<z.infer<typeof statusSchema>>(req);
  const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Campaign not found");
  const campaign = await prisma.campaign.update({
    where: { id: req.params.id },
    data: { status },
    include: campaignIncludes,
  });
  res.json({ campaign });
}));

router.get("/campaigns/:id/stats", asyncHandler(async (req, res) => {
  const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
  if (!campaign) throw new ApiError(404, "Campaign not found");
  const stats = {
    totalSent: campaign.sentCount,
    opened: campaign.openCount,
    clicked: campaign.clickCount,
    converted: 0,
  };
  res.json({ stats });
}));

router.get("/promotions", asyncHandler(async (req, res) => {
  const { salonId, active } = req.query as { salonId?: string; active?: string };
  const where: Record<string, unknown> = {};
  if (salonId) where.salonId = salonId;
  if (active !== undefined) where.active = active === "true";
  const promotions = await prisma.promotion.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json({ promotions });
}));

router.post("/promotions", validate(promotionSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof promotionSchema>>(req);
  const promotion = await prisma.promotion.create({
    data: { ...data, startAt: new Date(data.startAt), endAt: new Date(data.endAt) },
  });
  res.status(201).json({ promotion });
}));

router.put("/promotions/:id", validate(promotionUpdateSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof promotionUpdateSchema>>(req);
  const existing = await prisma.promotion.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Promotion not found");
  const promotion = await prisma.promotion.update({
    where: { id: req.params.id },
    data: {
      ...data,
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
    },
  });
  res.json({ promotion });
}));

router.delete("/promotions/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.promotion.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Promotion not found");
  await prisma.promotion.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

router.get("/offers", asyncHandler(async (req, res) => {
  const { salonId } = req.query as { salonId?: string };
  const where: Record<string, unknown> = {};
  if (salonId) where.salonId = salonId;
  const offers = await prisma.offer.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json({ offers });
}));

router.post("/offers", validate(offerSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof offerSchema>>(req);
  const offer = await prisma.offer.create({
    data: { ...data, startAt: new Date(data.startAt), endAt: new Date(data.endAt) },
  });
  res.status(201).json({ offer });
}));

router.put("/offers/:id", validate(offerUpdateSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof offerUpdateSchema>>(req);
  const existing = await prisma.offer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Offer not found");
  const offer = await prisma.offer.update({
    where: { id: req.params.id },
    data: {
      ...data,
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
    },
  });
  res.json({ offer });
}));

router.delete("/offers/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.offer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Offer not found");
  await prisma.offer.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

router.get("/discounts", asyncHandler(async (req, res) => {
  const { salonId } = req.query as { salonId?: string };
  const where: Record<string, unknown> = {};
  if (salonId) where.salonId = salonId;
  const discounts = await prisma.discount.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json({ discounts });
}));

router.post("/discounts", validate(discountSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof discountSchema>>(req);
  const discount = await prisma.discount.create({
    data: {
      ...data,
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
    },
  });
  res.status(201).json({ discount });
}));

router.put("/discounts/:id", validate(discountUpdateSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof discountUpdateSchema>>(req);
  const existing = await prisma.discount.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Discount rule not found");
  const discount = await prisma.discount.update({
    where: { id: req.params.id },
    data: {
      ...data,
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
    },
  });
  res.json({ discount });
}));

router.delete("/discounts/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.discount.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Discount rule not found");
  await prisma.discount.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

router.post("/email-campaigns", requireRole("OWNER", "ADMIN"), asyncHandler(async (req, res) => {
  const { subject, body, senderName, replyTo } = req.body;
  if (!subject || !body) throw new ApiError(400, "subject and body required");
  const campaign = await prisma.campaign.create({
    data: {
      salonId: req.body.salonId, name: req.body.name || "Email Campaign",
      type: "EMAIL", status: "DRAFT",
    },
  });
  const emailCampaign = await prisma.emailCampaign.create({
    data: { campaignId: campaign.id, subject, body, senderName, replyTo },
  });
  res.status(201).json({ campaign, emailCampaign });
}));

router.post("/sms-campaigns", requireRole("OWNER", "ADMIN"), asyncHandler(async (req, res) => {
  const { message, senderId } = req.body;
  if (!message) throw new ApiError(400, "message required");
  const campaign = await prisma.campaign.create({
    data: {
      salonId: req.body.salonId, name: req.body.name || "SMS Campaign",
      type: "SMS", status: "DRAFT",
    },
  });
  const smsCampaign = await prisma.smsCampaign.create({
    data: { campaignId: campaign.id, message, senderId },
  });
  res.status(201).json({ campaign, smsCampaign });
}));

router.post("/push-campaigns", requireRole("OWNER", "ADMIN"), asyncHandler(async (req, res) => {
  const { title, body, imageUrl, deepLink } = req.body;
  if (!title || !body) throw new ApiError(400, "title and body required");
  const campaign = await prisma.campaign.create({
    data: {
      salonId: req.body.salonId, name: req.body.name || "Push Campaign",
      type: "PUSH", status: "DRAFT",
    },
  });
  const pushCampaign = await prisma.pushCampaign.create({
    data: { campaignId: campaign.id, title, body, imageUrl, deepLink },
  });
  res.status(201).json({ campaign, pushCampaign });
}));

export default router;
