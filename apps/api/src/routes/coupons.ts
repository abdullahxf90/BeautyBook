import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { getValidated, validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const validateSchema = z.object({
  code: z.string(),
  subtotal: z.number().int().nonnegative(),
  salonSlug: z.string().optional(),
});

router.post("/validate", validate(validateSchema), asyncHandler(async (req, res) => {
  const { code, subtotal, salonSlug } = getValidated<z.infer<typeof validateSchema>>(req);
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || !coupon.active) throw new ApiError(400, "Invalid coupon code");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new ApiError(400, "This coupon has expired");
  if (coupon.maxUses && coupon.uses >= coupon.maxUses) throw new ApiError(400, "This coupon has been fully redeemed");
  if (coupon.salonId && salonSlug) {
    const salon = await prisma.salon.findUnique({ where: { slug: salonSlug }, select: { id: true } });
    if (!salon || coupon.salonId !== salon.id) throw new ApiError(400, "This coupon is not valid at this salon");
  }
  if (subtotal < coupon.minTotal) {
    throw new ApiError(400, `This coupon requires a minimum spend of Rs ${coupon.minTotal}`);
  }
  const discount = Math.min(
    coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value,
    subtotal,
  );
  res.json({ valid: true, code: coupon.code, discount });
}));

router.get("/", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const where: any = {};
  if (req.query.active) where.active = req.query.active === "true";
  if (req.query.salonId) where.salonId = req.query.salonId;
  const [total, coupons] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.findMany({ where, orderBy: { id: "asc" }, skip: (page - 1) * limit, take: limit, include: { salon: { select: { id: true, name: true } } } }),
  ]);
  res.json({ coupons, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.get("/:id", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id }, include: { salon: { select: { id: true, name: true } } } });
  if (!coupon) throw new ApiError(404, "Coupon not found");
  const usage = await prisma.couponUsage.findMany({ where: { couponId: req.params.id }, orderBy: { usedAt: "desc" }, take: 100 });
  res.json({ coupon, usage });
}));

const createSchema = z.object({
  code: z.string().min(2).max(20).transform(s => s.toUpperCase()),
  salonId: z.string().optional(),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().min(1),
  minTotal: z.number().int().min(0).default(0),
  maxUses: z.number().int().min(1).optional(),
  maxPerUser: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

router.post("/", requireRole("ADMIN", "SUPER_ADMIN"), validate(createSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof createSchema>>(req);
  const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
  if (existing) throw new ApiError(409, "Coupon code already exists");
  const coupon = await prisma.coupon.create({ data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined } });
  res.status(201).json({ coupon });
}));

const updateSchema = z.object({
  value: z.number().int().min(1).optional(),
  minTotal: z.number().int().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  maxPerUser: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  active: z.boolean().optional(),
  salonId: z.string().nullable().optional(),
});

router.put("/:id", requireRole("ADMIN", "SUPER_ADMIN"), validate(updateSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof updateSchema>>(req);
  const patch: any = { ...data };
  if (data.expiresAt) patch.expiresAt = new Date(data.expiresAt);
  const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data: patch });
  res.json({ coupon });
}));

router.delete("/:id", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  await prisma.coupon.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

router.get("/:id/usage", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const usage = await prisma.couponUsage.findMany({
    where: { couponId: req.params.id },
    orderBy: { usedAt: "desc" }, take: 100,
  });
  res.json({ usage });
}));

export default router;
