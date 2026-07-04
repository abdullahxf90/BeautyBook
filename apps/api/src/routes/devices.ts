import { Router } from "express";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const devices = await prisma.userDevice.findMany({
    where: { userId: req.user!.id },
    orderBy: { lastUsedAt: "desc" },
  });
  res.json({ devices });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, type, os, browser } = req.body as { name?: string; type?: string; os?: string; browser?: string };
  const device = await prisma.userDevice.create({
    data: { userId: req.user!.id, name: name || "Unknown Device", type: type || "DESKTOP", os, browser },
  });
  res.status(201).json({ device });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const device = await prisma.userDevice.findUnique({ where: { id: req.params.id } });
  if (!device || device.userId !== req.user!.id) throw new ApiError(404, "Device not found");
  await prisma.userDevice.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

router.post("/:id/trust", asyncHandler(async (req, res) => {
  const device = await prisma.userDevice.update({ where: { id: req.params.id }, data: { isTrusted: true } });
  res.json({ device });
}));

export default router;
