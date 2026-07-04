import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

const flagToggleSchema = z.object({
  enabled: z.boolean(),
});

const settingUpdateSchema = z.object({
  value: z.string(),
  type: z.enum(["STRING", "NUMBER", "BOOLEAN", "JSON"]).optional(),
  group: z.string().optional(),
  description: z.string().optional(),
});

// ─── Feature Flags ──────────────────────────────

router.get("/feature-flags", requireAuth, asyncHandler(async (_req, res) => {
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  res.json({ flags });
}));

router.get("/feature-flags/:key", requireAuth, asyncHandler(async (req, res) => {
  const flag = await prisma.featureFlag.findUnique({ where: { key: req.params.key } });
  if (!flag) throw new ApiError(404, "Feature flag not found");
  res.json({ flag });
}));

router.put("/feature-flags/:key", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(flagToggleSchema), asyncHandler(async (req, res) => {
  const { enabled } = getValidated<z.infer<typeof flagToggleSchema>>(req);
  const flag = await prisma.featureFlag.upsert({
    where: { key: req.params.key },
    update: { enabled },
    create: { key: req.params.key, name: req.params.key, enabled },
  });
  res.json({ flag });
}));

// ─── App Settings ───────────────────────────────

router.get("/settings", requireAuth, asyncHandler(async (req, res) => {
  const { group } = req.query;
  const where: Record<string, unknown> = {};
  if (group) where.group = group;
  const settings = await prisma.appSetting.findMany({ where: where as any, orderBy: { key: "asc" } });
  res.json({ settings });
}));

router.put("/settings/:key", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(settingUpdateSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof settingUpdateSchema>>(req);
  const setting = await prisma.appSetting.upsert({
    where: { key: req.params.key },
    update: data,
    create: { key: req.params.key, value: data.value, type: data.type ?? "STRING", group: data.group ?? "general", description: data.description },
  });
  res.json({ setting });
}));

// ─── System Logs ────────────────────────────────

router.get("/system-logs", requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const { level, module, startDate, endDate } = req.query;
  const where: Record<string, unknown> = {};
  if (level) where.level = level;
  if (module) where.module = module;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as any).gte = new Date(startDate as string);
    if (endDate) (where.createdAt as any).lte = new Date(endDate as string);
  }
  const [total, logs] = await Promise.all([
    prisma.systemLog.count({ where: where as any }),
    prisma.systemLog.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

// ─── Audit Logs ─────────────────────────────────

router.get("/audit-logs", requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const { action, entity, userId, startDate, endDate } = req.query;
  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as any).gte = new Date(startDate as string);
    if (endDate) (where.createdAt as any).lte = new Date(endDate as string);
  }
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where: where as any }),
    prisma.auditLog.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

export default router;
