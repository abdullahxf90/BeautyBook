import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";

const router = Router();

router.get("/", asyncHandler(async (_req, res) => {
  const [cities, categories] = await Promise.all([
    prisma.city.findMany({ include: { areas: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  res.json({ cities, categories });
}));

export default router;
