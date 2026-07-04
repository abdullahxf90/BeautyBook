import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/logs", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const [total, logs] = await Promise.all([
    prisma.securityLog.count({ where: { userId: req.user!.id } }),
    prisma.securityLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
    }),
  ]);
  res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.get("/sessions", asyncHandler(async (req, res) => {
  const sessions = await prisma.refreshToken.findMany({
    where: { userId: req.user!.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ sessions });
}));

router.post("/sessions/revoke-all", asyncHandler(async (req, res) => {
  await prisma.refreshToken.deleteMany({ where: { userId: req.user!.id } });
  res.json({ ok: true });
}));

export default router;
