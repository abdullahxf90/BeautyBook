import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = await prisma.notification.count({ where: { userId: req.user!.id, read: false } });
  res.json({ notifications, unread });
}));

router.post("/read", asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  });
  res.json({ ok: true });
}));

router.post("/:id/read", asyncHandler(async (req, res) => {
  const { count } = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: { read: true },
  });
  if (!count) return res.status(404).json({ error: "Notification not found" });
  res.json({ ok: true });
}));

router.delete("/read", asyncHandler(async (req, res) => {
  const { count } = await prisma.notification.deleteMany({
    where: { userId: req.user!.id, read: true },
  });
  res.json({ ok: true, deleted: count });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const { count } = await prisma.notification.deleteMany({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!count) return res.status(404).json({ error: "Notification not found" });
  res.json({ ok: true });
}));

export default router;
