import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

router.get("/plans", asyncHandler(async (_req, res) => {
  const memberships = await prisma.membership.findMany({ where: { active: true }, orderBy: { price: "asc" } });
  res.json({ memberships });
}));

router.use(requireAuth);

router.get("/mine", asyncHandler(async (req, res) => {
  const memberships = await prisma.userMembership.findMany({
    where: { userId: req.user!.id },
    include: { membership: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ memberships });
}));

const purchaseSchema = z.object({ membershipId: z.string() });

router.post("/purchase", validate(purchaseSchema), asyncHandler(async (req, res) => {
  const { membershipId } = getValidated<z.infer<typeof purchaseSchema>>(req);
  const plan = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!plan || !plan.active) throw new ApiError(404, "Membership plan not found");
  const existing = await prisma.userMembership.findFirst({
    where: { userId: req.user!.id, status: "ACTIVE", membershipId },
  });
  if (existing) throw new ApiError(409, "You already have an active membership of this type");
  const membership = await prisma.userMembership.create({
    data: {
      userId: req.user!.id, membershipId: plan.id,
      startAt: new Date(), expiresAt: new Date(Date.now() + plan.durationDays * 86400000),
    },
  });
  res.status(201).json({ membership: { ...membership, membership: plan } });
}));

router.post("/:id/cancel", asyncHandler(async (req, res) => {
  const membership = await prisma.userMembership.findUnique({ where: { id: req.params.id } });
  if (!membership || membership.userId !== req.user!.id) throw new ApiError(404, "Membership not found");
  const updated = await prisma.userMembership.update({ where: { id: membership.id }, data: { status: "CANCELLED" } });
  res.json({ membership: updated });
}));

// Admin
router.post("/plans", requireRole("ADMIN", "SUPER_ADMIN"), validate(z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2),
  description: z.string().min(10).max(2000),
  price: z.number().int().min(0),
  durationDays: z.number().int().min(1),
  perks: z.array(z.string()).default([]),
})), asyncHandler(async (req, res) => {
  const data = getValidated<any>(req);
  const plan = await prisma.membership.create({ data: { ...data, perks: JSON.stringify(data.perks) } });
  res.status(201).json({ membership: plan });
}));

export default router;
