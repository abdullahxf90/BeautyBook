import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../../utils/http";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getValidated, validate } from "../../middleware/validate";
import { getFunnel } from "../../lib/analytics";

const router = Router();
router.use(requireAuth);

const stepSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().min(0),
  eventName: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
});

router.get("/", asyncHandler(async (req, res) => {
  const { salonId, period } = req.query as { salonId?: string; period?: string };
  const funnel = await getFunnel(salonId, period || "30d");
  res.json({ funnel });
}));

router.get("/steps", asyncHandler(async (req, res) => {
  const steps = await prisma.funnelStep.findMany({ orderBy: { order: "asc" } });
  res.json({ steps });
}));

router.post("/steps", requireRole("ADMIN"), validate(stepSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof stepSchema>>(req);
  const step = await prisma.funnelStep.create({ data });
  res.status(201).json({ step });
}));

router.put("/steps/:id", requireRole("ADMIN"), validate(stepSchema.partial()), asyncHandler(async (req, res) => {
  const data = getValidated<Partial<z.infer<typeof stepSchema>>>(req);
  const step = await prisma.funnelStep.update({ where: { id: req.params.id }, data });
  res.json({ step });
}));

router.delete("/steps/:id", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  await prisma.funnelStep.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

export default router;
