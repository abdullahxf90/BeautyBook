import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BB-";
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const giftCards = await prisma.giftCard.findMany({
    where: { purchaserId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: { recipient: { select: { name: true, email: true } } },
  });
  res.json({ giftCards });
}));

router.get("/received", asyncHandler(async (req, res) => {
  const giftCards = await prisma.giftCard.findMany({
    where: { recipientId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ giftCards });
}));

const createSchema = z.object({
  amount: z.number().int().min(100).max(100000),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().min(2).max(80).optional(),
  message: z.string().max(500).optional(),
});

router.post("/", validate(createSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof createSchema>>(req);
  const code = generateCode();
  const giftCard = await prisma.giftCard.create({
    data: { code, purchaserId: req.user!.id, amount: data.amount, balance: data.amount, message: data.message, recipientEmail: data.recipientEmail, recipientName: data.recipientName },
  });
  res.status(201).json({ giftCard });
}));

const redeemSchema = z.object({ code: z.string().regex(/^BB-/), amount: z.number().int().min(1) });

router.post("/redeem", validate(redeemSchema), asyncHandler(async (req, res) => {
  const { code, amount } = getValidated<z.infer<typeof redeemSchema>>(req);
  const card = await prisma.giftCard.findUnique({ where: { code: code.toUpperCase() } });
  if (!card) throw new ApiError(404, "Gift card not found");
  if (card.recipientId && card.recipientId !== req.user!.id) throw new ApiError(403, "This gift card was issued to someone else");
  if (card.balance < amount) throw new ApiError(400, "Insufficient balance on gift card");
  if (card.expiresAt && card.expiresAt < new Date()) throw new ApiError(400, "This gift card has expired");
  await prisma.giftCard.update({ where: { id: card.id }, data: { balance: { decrement: amount } } });
  res.json({ giftCard: { ...card, balance: card.balance - amount } });
}));

// Admin: all gift cards
router.get("/all", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (_req, res) => {
  const giftCards = await prisma.giftCard.findMany({ orderBy: { createdAt: "desc" }, include: { purchaser: { select: { name: true, email: true } } } });
  res.json({ giftCards });
}));

export default router;
