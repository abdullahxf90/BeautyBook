import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";

const router = Router();

const TIERS = [
  { name: "BRONZE", minPoints: 0, color: "#cd7f32", benefits: ["Standard booking", "Basic support"] },
  { name: "SILVER", minPoints: 100, color: "#c0c0c0", benefits: ["5% discount on services", "Priority support"] },
  { name: "GOLD", minPoints: 500, color: "#ffd700", benefits: ["10% discount", "Priority booking", "Birthday gift"] },
  { name: "PLATINUM", minPoints: 1500, color: "#e5e4e2", benefits: ["15% discount", "VIP booking", "Free add-ons", "Exclusive offers"] },
  { name: "DIAMOND", minPoints: 4000, color: "#b9f2ff", benefits: ["20% discount", "VIP priority", "Free services", "Dedicated support", "Early access"] },
];

function tierFromPoints(points: number): string {
  let tier = "BRONZE";
  for (const t of TIERS) {
    if (points >= t.minPoints) tier = t.name;
  }
  return tier;
}

router.get("/tiers", (_req, res) => {
  res.json({ tiers: TIERS });
});

router.get("/my-tier", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { loyaltyPoints: true, loyaltyTier: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const currentTier = user.loyaltyTier;
  const currentIdx = TIERS.findIndex(t => t.name === currentTier);
  const nextTier = currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;
  const pointsForNext = nextTier ? user.loyaltyPoints - TIERS[currentIdx].minPoints : 0;
  const pointsNeeded = nextTier ? nextTier.minPoints - TIERS[currentIdx].minPoints : 1;
  const progress = nextTier ? Math.min(100, Math.round((pointsForNext / pointsNeeded) * 100)) : 100;

  res.json({
    tier: currentTier,
    tierIndex: currentIdx,
    points: user.loyaltyPoints,
    nextTier: nextTier ? { name: nextTier.name, minPoints: nextTier.minPoints } : null,
    progress,
    pointsForNext: nextTier ? nextTier.minPoints - user.loyaltyPoints : 0,
  });
}));

router.post("/calculate", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, loyaltyPoints: true, loyaltyTier: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const newTier = tierFromPoints(user.loyaltyPoints);
  if (newTier !== user.loyaltyTier) {
    await prisma.user.update({
      where: { id: user.id },
      data: { loyaltyTier: newTier },
    });
    return res.json({ previousTier: user.loyaltyTier, currentTier: newTier, updated: true });
  }
  res.json({ previousTier: user.loyaltyTier, currentTier: user.loyaltyTier, updated: false });
}));

export default router;
