import { Router } from "express";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const ids = ((req.query.ids as string) || "").split(",").filter(Boolean).slice(0, 3);
  if (ids.length < 2) throw new ApiError(400, "Provide at least 2 salon IDs to compare");
  const salons = await prisma.salon.findMany({
    where: { id: { in: ids } },
    include: {
      area: { include: { city: true } },
      images: { take: 3, orderBy: { sort: "asc" } },
      services: { where: { active: true }, take: 10, orderBy: { price: "asc" } },
      employees: { where: { active: true }, take: 5 },
      workingHours: true,
    },
  });
  res.json({ salons });
}));

export default router;
