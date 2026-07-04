import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";

const router = Router();

router.get("/suggestions", asyncHandler(async (req, res) => {
  const q = (req.query.q as string) || "";
  if (q.length < 2) return res.json({ suggestions: [], salons: [], services: [] });

  const [salons, services, categories] = await Promise.all([
    prisma.salon.findMany({
      where: { name: { contains: q, mode: "insensitive" }, verified: true },
      take: 5, select: { slug: true, name: true, area: { select: { name: true, city: { select: { name: true } } } } },
    }),
    prisma.service.findMany({
      where: { name: { contains: q, mode: "insensitive" }, active: true },
      take: 5, select: { name: true, salon: { select: { slug: true, name: true } } },
    }),
    prisma.category.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 3, select: { name: true, slug: true },
    }),
  ]);

  res.json({ suggestions: [], salons, services, categories });
}));

router.get("/trending", asyncHandler(async (_req, res) => {
  const trending = await prisma.searchHistory.groupBy({
    by: ["query"], _count: { query: true },
    orderBy: { _count: { query: "desc" } },
    take: 10,
  });
  res.json({ trending: trending.map(t => ({ query: t.query, count: t._count.query })) });
}));

export default router;
