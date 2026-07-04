import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  res.json({ addresses });
}));

const addressSchema = z.object({
  label: z.string().default("Home"),
  fullName: z.string().min(2).max(80),
  phone: z.string().min(10).max(16),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(80),
  area: z.string().min(2).max(80),
  isDefault: z.boolean().default(false),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

router.post("/", validate(addressSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof addressSchema>>(req);
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }
  const address = await prisma.address.create({ data: { ...data, userId: req.user!.id } });
  res.status(201).json({ address });
}));

router.patch("/:id", validate(addressSchema.partial()), asyncHandler(async (req, res) => {
  const data = getValidated<Record<string, unknown>>(req);
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }
  const address = await prisma.address.update({ where: { id: req.params.id }, data });
  res.json({ address });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.address.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

export default router;
