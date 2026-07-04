import { Router } from "express";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user!.id },
    include: {
      salon: { include: { area: { include: { city: true } }, images: { orderBy: { sort: "asc" }, take: 1 } } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ favorites });
}));

router.post("/:salonSlug/toggle", asyncHandler(async (req, res) => {
  const salon = await prisma.salon.findUnique({ where: { slug: req.params.salonSlug }, select: { id: true } });
  if (!salon) throw new ApiError(404, "Salon not found");
  const existing = await prisma.favorite.findUnique({
    where: { userId_salonId: { userId: req.user!.id, salonId: salon.id } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return res.json({ favorited: false });
  }
  await prisma.favorite.create({ data: { userId: req.user!.id, salonId: salon.id } });
  res.json({ favorited: true });
}));

export default router;
