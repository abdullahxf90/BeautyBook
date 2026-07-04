import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";

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

export default router;
