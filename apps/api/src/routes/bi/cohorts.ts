import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../../utils/http";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getValidated, validate } from "../../middleware/validate";
import { generateCohortAnalysis } from "../../lib/analytics";

const router = Router();
router.use(requireAuth);
router.use(requireRole("ADMIN", "SUPER_ADMIN"));

router.get("/", asyncHandler(async (req, res) => {
  const { type, period } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (period) where.period = period;
  const cohorts = await prisma.cohort.findMany({
    where: where as any,
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const parsed = cohorts.map((c) => ({ ...c, data: JSON.parse(c.data) }));
  res.json({ cohorts: parsed });
}));

router.post("/generate", validate(z.object({
  period: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY"]).optional().default("MONTHLY"),
  intervals: z.number().int().min(3).max(24).optional().default(12),
})), asyncHandler(async (req, res) => {
  const { period, intervals } = getValidated<{ period: string; intervals: number }>(req);
  const data = await generateCohortAnalysis(period.toLowerCase() as "weekly" | "monthly", intervals);
  res.json({ cohorts: data });
}));

export default router;
