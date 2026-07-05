import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../../utils/http";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getValidated, validate } from "../../middleware/validate";

const router = Router();
router.use(requireAuth);

const widgetCreateSchema = z.object({
  type: z.string(),
  title: z.string().min(1),
  metric: z.string(),
  aggregation: z.string().optional().default("SUM"),
  period: z.string().optional().default("30d"),
  size: z.string().optional().default("MEDIUM"),
  width: z.number().int().min(1).max(12).optional().default(4),
  height: z.number().int().min(1).max(6).optional().default(3),
  config: z.record(z.unknown()).optional(),
  filters: z.record(z.unknown()).optional(),
});

const dashboardCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  layout: z.enum(["GRID", "FREE", "FLEX"]).optional().default("GRID"),
  type: z.enum(["CUSTOM", "ADMIN", "SALON_OWNER", "CUSTOMER"]).optional().default("CUSTOM"),
  isDefault: z.boolean().optional().default(false),
  salonId: z.string().optional(),
});

router.get("/", asyncHandler(async (req, res) => {
  const where: Record<string, unknown> = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.salonId) where.salonId = req.query.salonId;

  if (req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN") {
  } else if (req.query.type === "SALON_OWNER") {
    where.OR = [{ salonId: req.query.salonId }, { userId: req.user!.id }, { type: "SALON_OWNER", isDefault: true }];
  } else {
    where.OR = [{ userId: req.user!.id }, { isDefault: true, type: req.user!.role === "ADMIN" ? "ADMIN" : "CUSTOMER" }];
  }

  const dashboards = await prisma.dashboard.findMany({ where: where as any, orderBy: { createdAt: "desc" } });
  res.json({ dashboards });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: req.params.id },
    include: { widgets: { orderBy: [{ positionY: "asc" }, { positionX: "asc" }] } },
  });
  if (!dashboard) throw new ApiError(404, "Dashboard not found");
  res.json({ dashboard });
}));

router.post("/", validate(dashboardCreateSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof dashboardCreateSchema>>(req);
  const dashboard = await prisma.dashboard.create({
    data: { ...data, userId: req.user!.id },
  });
  res.status(201).json({ dashboard });
}));

router.put("/:id", validate(dashboardCreateSchema.partial()), asyncHandler(async (req, res) => {
  const data = getValidated<Partial<z.infer<typeof dashboardCreateSchema>>>(req);
  const dashboard = await prisma.dashboard.update({ where: { id: req.params.id }, data });
  res.json({ dashboard });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.dashboard.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

router.post("/:id/widgets", validate(widgetCreateSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof widgetCreateSchema>>(req);
  const dashboard = await prisma.dashboard.findUnique({ where: { id: req.params.id } });
  if (!dashboard) throw new ApiError(404, "Dashboard not found");

  const widgets = await prisma.dashboardWidget.findMany({ where: { dashboardId: req.params.id }, orderBy: { positionY: "desc" } });
  const nextY = widgets.length > 0 ? Math.max(...widgets.map((w) => w.positionY)) + (data.height || 3) : 0;

  const widget = await prisma.dashboardWidget.create({
    data: {
      dashboardId: req.params.id,
      type: data.type,
      title: data.title,
      metric: data.metric,
      aggregation: data.aggregation,
      period: data.period,
      size: data.size,
      width: data.width,
      height: data.height,
      positionY: nextY,
      config: data.config ? JSON.stringify(data.config) : null,
      filters: data.filters ? JSON.stringify(data.filters) : null,
    },
  });
  res.status(201).json({ widget });
}));

router.put("/:id/widgets/:widgetId", validate(widgetCreateSchema.partial()), asyncHandler(async (req, res) => {
  const data = getValidated<Partial<z.infer<typeof widgetCreateSchema>>>(req);
  const updateData: Record<string, unknown> = { ...data };
  if (data.config) updateData.config = JSON.stringify(data.config);
  if (data.filters) updateData.filters = JSON.stringify(data.filters);
  const widget = await prisma.dashboardWidget.update({ where: { id: req.params.widgetId }, data: updateData });
  res.json({ widget });
}));

router.delete("/:id/widgets/:widgetId", asyncHandler(async (req, res) => {
  await prisma.dashboardWidget.delete({ where: { id: req.params.widgetId } });
  res.json({ success: true });
}));

router.get("/:id/data", asyncHandler(async (req, res) => {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: req.params.id },
    include: { widgets: { orderBy: [{ positionY: "asc" }, { positionX: "asc" }] } },
  });
  if (!dashboard) throw new ApiError(404, "Dashboard not found");

  const widgetData = await Promise.all(dashboard.widgets.map(async (widget) => {
    const filters = widget.filters ? JSON.parse(widget.filters) : {};
    const salonId = filters.salonId || req.query.salonId as string;

    let data: unknown = null;
    switch (widget.metric) {
      case "bookings":
        data = await getBookingMetric(salonId, widget.period, widget.aggregation);
        break;
      case "revenue":
        data = await getRevenueMetric(salonId, widget.period, widget.aggregation);
        break;
      case "users":
        data = await getUserMetric(widget.period, widget.aggregation);
        break;
      case "salons":
        data = await getSalonMetric(widget.period);
        break;
      case "ratings":
        data = await getRatingMetric(salonId);
        break;
      case "services":
        data = await getTopServices(salonId);
        break;
      default:
        data = { error: "Unknown metric" };
    }

    return { id: widget.id, type: widget.type, title: widget.title, metric: widget.metric, config: widget.config ? JSON.parse(widget.config) : null, data };
  }));

  res.json({ dashboard, widgets: widgetData });
}));

async function getBookingMetric(salonId?: string, period = "30d", aggregation = "SUM") {
  const { start, end } = periodRange(period);
  const where: Record<string, unknown> = { startAt: { gte: start, lte: end } };
  if (salonId) where.salonId = salonId;

  if (aggregation === "COUNT") return { total: await prisma.booking.count({ where: where as any }) };
  const agg = await prisma.booking.aggregate({ where: where as any, _count: { id: true }, _sum: { total: true } });
  return { total: agg._count.id, sum: agg._sum.total ?? 0 };
}

async function getRevenueMetric(salonId?: string, period = "30d", aggregation = "SUM") {
  const { start, end } = periodRange(period);
  const where: Record<string, unknown> = { startAt: { gte: start, lte: end }, status: "COMPLETED" };
  if (salonId) where.salonId = salonId;
  const agg = await prisma.booking.aggregate({ where: where as any, _sum: { total: true }, _avg: { total: true } });
  return { total: agg._sum.total ?? 0, avg: agg._avg.total ?? 0 };
}

async function getUserMetric(period = "30d", aggregation = "SUM") {
  const { start, end } = periodRange(period);
  const total = await prisma.user.count({ where: { createdAt: { gte: start, lte: end }, status: { not: "DELETED" } } });
  return { total };
}

async function getSalonMetric(period = "30d") {
  const { start, end } = periodRange(period);
  const active = await prisma.booking.groupBy({ by: ["salonId"], where: { startAt: { gte: start, lte: end } }, _count: { id: true } });
  return { activeSalons: active.length, total: await prisma.salon.count() };
}

async function getRatingMetric(salonId?: string) {
  const where = salonId ? { salonId } : {};
  const agg = await prisma.review.aggregate({ where, _avg: { rating: true }, _count: { id: true } });
  return { avgRating: agg._avg.rating ?? 0, total: agg._count.id };
}

async function getTopServices(salonId?: string) {
  const where: Record<string, unknown> = {};
  if (salonId) where.salonId = salonId;
  const services = await prisma.bookingItem.groupBy({
    by: ["name"], where: where as any,
    _count: { id: true }, _sum: { price: true },
    orderBy: { _count: { id: "desc" } }, take: 10,
  });
  return services.map((s) => ({ name: s.name, bookings: s._count.id, revenue: s._sum.price ?? 0 }));
}

function periodRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "7d": start.setDate(start.getDate() - 7); break;
    case "30d": start.setMonth(start.getMonth() - 1); break;
    case "90d": start.setMonth(start.getMonth() - 3); break;
    case "1y": start.setFullYear(start.getFullYear() - 1); break;
  }
  return { start, end };
}

export default router;
