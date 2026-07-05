import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../../utils/http";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getValidated, validate } from "../../middleware/validate";
import { getRevenueForecast, generateAndSaveForecast } from "../../lib/analytics";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const { type, entityId, entityType } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (entityId) where.entityId = entityId;
  if (entityType) where.entityType = entityType;

  const forecasts = await prisma.forecast.findMany({
    where: where as any,
    orderBy: { generatedAt: "desc" },
    take: 50,
  });

  const parsed = forecasts.map((f) => ({
    ...f,
    points: f.points ? JSON.parse(f.points) : [],
  }));

  res.json({ forecasts: parsed });
}));

router.get("/revenue", asyncHandler(async (req, res) => {
  const salonId = req.query.salonId as string | undefined;
  const months = parseInt(req.query.months as string) || 3;
  const result = await getRevenueForecast(salonId, months);
  res.json(result);
}));

router.post("/generate", requireRole("ADMIN"), validate(z.object({
  type: z.enum(["REVENUE", "BOOKINGS", "CUSTOMERS", "SALONS", "DEMAND", "INVENTORY"]),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  periods: z.number().int().min(1).max(365).optional().default(30),
})), asyncHandler(async (req, res) => {
  const { type, entityId, entityType, periods } = getValidated<{ type: string; entityId?: string; entityType?: string; periods?: number }>(req);
  const points = await generateAndSaveForecast(type, entityId, entityType, periods);
  res.json({ type, entityId, entityType, points });
}));

export default router;
