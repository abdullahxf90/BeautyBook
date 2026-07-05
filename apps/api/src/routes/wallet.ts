import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id }, select: { loyaltyPoints: true },
  });
  const transactions = await prisma.walletTransaction.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" }, take: 50,
  });
  const balance = transactions.length > 0 ? transactions[0].balance : 0;
  res.json({ balance: user?.loyaltyPoints ?? 0, walletBalance: balance, transactions });
}));

router.get("/transactions", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const [total, transactions] = await Promise.all([
    prisma.walletTransaction.count({ where: { userId: req.user!.id } }),
    prisma.walletTransaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
    }),
  ]);
  res.json({ transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.get("/loyalty", asyncHandler(async (req, res) => {
  const transactions = await prisma.loyaltyTransaction.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" }, take: 50,
  });
  const total = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { loyaltyPoints: true } });
  res.json({ points: total?.loyaltyPoints ?? 0, transactions });
}));

router.post("/deposit", validate(z.object({ amount: z.number().int().min(100), provider: z.string().optional(), providerRef: z.string().optional() })), asyncHandler(async (req, res) => {
  const { amount } = getValidated<{ amount: number }>(req);
  const last = await prisma.walletTransaction.findFirst({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" }, select: { balance: true } });
  const balance = (last?.balance ?? 0) + amount;
  const txn = await prisma.walletTransaction.create({
    data: { userId: req.user!.id, type: "CREDIT", amount, balance, reason: "DEPOSIT" },
  });
  res.status(201).json({ transaction: txn, balance });
}));

router.post("/transfer", validate(z.object({ amount: z.number().int().min(1), toUserId: z.string() })), asyncHandler(async (req, res) => {
  const { amount, toUserId } = getValidated<{ amount: number; toUserId: string }>(req);
  const last = await prisma.walletTransaction.findFirst({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" }, select: { balance: true } });
  const currentBalance = last?.balance ?? 0;
  if (currentBalance < amount) throw new ApiError(400, "Insufficient balance");
  await prisma.$transaction([
    prisma.walletTransaction.create({ data: { userId: req.user!.id, type: "DEBIT", amount, balance: currentBalance - amount, reason: "TRANSFER" } }),
    prisma.walletTransaction.create({ data: { userId: toUserId, type: "CREDIT", amount, balance: amount, reason: "TRANSFER" } }),
  ]);
  res.json({ success: true });
}));

export default router;
