import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { getValidated, validate } from "../middleware/validate";

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

export default router;
