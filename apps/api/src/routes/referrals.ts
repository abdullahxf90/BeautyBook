import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";
import { nanoid } from "nanoid";

const router = Router();
router.use(requireAuth);

router.get("/code", asyncHandler(async (req, res) => {
  let user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { referralCode: true } });
  if (!user?.referralCode) {
    const code = nanoid(8).toUpperCase();
    user = await prisma.user.update({ where: { id: req.user!.id }, data: { referralCode: code }, select: { referralCode: true } });
  }
  res.json({ referralCode: user.referralCode });
}));

const claimSchema = z.object({ code: z.string().min(1).max(20) });

router.post("/claim", validate(claimSchema), asyncHandler(async (req, res) => {
  const { code } = getValidated<z.infer<typeof claimSchema>>(req);
  const referring = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!referring) throw new ApiError(404, "Invalid referral code");
  if (referring.id === req.user!.id) throw new ApiError(400, "Cannot use your own referral code");
  const existing = await prisma.referralReward.findFirst({
    where: { claimantId: req.user!.id, referral: { userId: referring.id } },
  });
  if (existing) throw new ApiError(400, "Referral already claimed");

  let referral = await prisma.referral.findFirst({ where: { userId: referring.id, active: true } });
  if (!referral) {
    referral = await prisma.referral.create({
      data: { userId: referring.id, code, rewardPoints: 100 },
    });
  }
  if (referral.maxUses && referral.useCount >= referral.maxUses) {
    throw new ApiError(400, "Referral code has reached its usage limit");
  }
  const reward = await prisma.referralReward.create({
    data: { referralId: referral.id, referrerId: referring.id, claimantId: req.user!.id, points: referral.rewardPoints, status: "AWARDED" },
  });
  await prisma.referral.update({ where: { id: referral.id }, data: { useCount: { increment: 1 } } });
  await prisma.loyaltyTransaction.create({
    data: { userId: req.user!.id, points: referral.rewardPoints, reason: "REFERRAL", type: "EARN" },
  });
  await prisma.loyaltyTransaction.create({
    data: { userId: referring.id, points: referral.rewardPoints, reason: "REFERRAL", type: "EARN" },
  });
  await prisma.user.update({ where: { id: req.user!.id }, data: { loyaltyPoints: { increment: referral.rewardPoints }, referredBy: referring.id } });
  await prisma.user.update({ where: { id: referring.id }, data: { loyaltyPoints: { increment: referral.rewardPoints } } });
  res.status(201).json({ reward });
}));

router.get("/rewards", asyncHandler(async (req, res) => {
  const rewards = await prisma.referralReward.findMany({
    where: { OR: [{ referrerId: req.user!.id }, { claimantId: req.user!.id }] },
    orderBy: { createdAt: "desc" }, take: 50,
    include: { referrer: { select: { id: true, name: true } }, claimant: { select: { id: true, name: true } } },
  });
  res.json({ rewards });
}));

router.get("/stats", asyncHandler(async (req, res) => {
  const [totalReferrals, rewards, earnedPoints] = await Promise.all([
    prisma.referralReward.count({ where: { referrerId: req.user!.id } }),
    prisma.referralReward.findMany({
      where: { referrerId: req.user!.id },
      select: { points: true },
    }),
    prisma.loyaltyTransaction.findMany({
      where: { userId: req.user!.id, reason: "REFERRAL" },
      select: { points: true },
    }),
  ]);
  const pointsFromReferrals = earnedPoints.reduce((sum, t) => sum + t.points, 0);
  const pointsAwarded = rewards.reduce((sum, r) => sum + r.points, 0);
  res.json({ totalReferrals, pointsEarned: pointsFromReferrals, pointsAwarded });
}));

export default router;
