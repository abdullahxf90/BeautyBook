import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../../utils/http";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getValidated, validate } from "../../middleware/validate";
import { toCSV, toJSON, generateReportHtml, getRevenueAnalytics, getSalonAnalytics, getCustomerAnalytics, getMarketingAnalytics } from "../../lib/analytics";

const router = Router();
router.use(requireAuth);

const reportSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"]),
  category: z.enum(["GENERAL", "SALON", "REVENUE", "CUSTOMER", "MARKETING", "STAFF", "INVENTORY"]),
  filters: z.record(z.unknown()).optional(),
  schedule: z.string().optional(),
  recipients: z.array(z.string().email()).optional(),
  format: z.enum(["CSV", "PDF", "JSON", "EXCEL"]).optional().default("PDF"),
});

router.get("/", asyncHandler(async (req, res) => {
  const { type, category, status } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (category) where.category = category;
  if (status) where.status = status;
  const reports = await prisma.report.findMany({ where: where as any, orderBy: { createdAt: "desc" }, take: 50 });
  res.json({ reports });
}));

router.post("/", requireRole("ADMIN"), validate(reportSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof reportSchema>>(req);
  const report = await prisma.report.create({
    data: {
      name: data.name,
      type: data.type,
      category: data.category,
      filters: data.filters ? JSON.stringify(data.filters) : null,
      schedule: data.schedule || null,
      recipients: data.recipients ? JSON.stringify(data.recipients) : null,
      format: data.format,
      createdBy: req.user!.id,
    },
  });
  res.status(201).json({ report });
}));

router.put("/:id", requireRole("ADMIN"), validate(reportSchema.partial()), asyncHandler(async (req, res) => {
  const data = getValidated<Partial<z.infer<typeof reportSchema>>>(req);
  const updateData: Record<string, unknown> = { ...data };
  if (data.filters) updateData.filters = JSON.stringify(data.filters);
  if (data.recipients) updateData.recipients = JSON.stringify(data.recipients);
  const report = await prisma.report.update({ where: { id: req.params.id }, data: updateData });
  res.json({ report });
}));

router.delete("/:id", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  await prisma.report.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

router.post("/:id/generate", asyncHandler(async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) throw new ApiError(404, "Report not found");

  const filters = report.filters ? JSON.parse(report.filters) : {};
  const salonId = filters.salonId as string | undefined;
  const period = filters.period || "30d";

  let data: Record<string, unknown> = {};

  switch (report.category) {
    case "REVENUE": {
      const revenue = await getRevenueAnalytics(salonId, period);
      data = { Revenue: revenue.monthly, Summary: revenue.totals, byMethod: revenue.byMethod } as any;
      break;
    }
    case "SALON": {
      if (salonId) {
        const salon = await getSalonAnalytics(salonId, period);
        data = { SalonAnalytics: salon } as any;
      } else {
        const salons = await prisma.salon.findMany({ select: { id: true, name: true } });
        const allSalonData = await Promise.all(salons.map(async (s) => {
          const a = await getSalonAnalytics(s.id, period);
          return { name: s.name, ...a };
        }));
        data = { SalonAnalytics: allSalonData };
      }
      break;
    }
    case "CUSTOMER": {
      const customer = await getCustomerAnalytics(salonId, period);
      data = { CustomerAnalytics: customer } as any;
      break;
    }
    case "MARKETING": {
      const marketing = await getMarketingAnalytics(period);
      data = { MarketingAnalytics: marketing } as any;
      break;
    }
    default: {
      const revenue = await getRevenueAnalytics(salonId, period);
      const customer = await getCustomerAnalytics(salonId, period);
      data = { Revenue: revenue.monthly, Summary: revenue.totals, Customers: customer } as any;
    }
  }

  await prisma.report.update({ where: { id: report.id }, data: { lastGeneratedAt: new Date() } });

  if (report.format === "CSV") {
    const csv = toCSV(Object.keys(data), Object.values(data).flatMap((v) => {
      if (Array.isArray(v)) return v.map((r: Record<string, unknown>) => Object.values(r).map(String));
      return [[JSON.stringify(v)]];
    }));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${report.name.replace(/\s+/g, "_").toLowerCase()}.csv"`);
    return res.send(csv);
  }

  if (report.format === "JSON") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${report.name.replace(/\s+/g, "_").toLowerCase()}.json"`);
    return res.send(toJSON(data));
  }

  const html = await generateReportHtml(data, report.name);
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Content-Disposition", report.format === "PDF" ? `attachment; filename="${report.name.replace(/\s+/g, "_").toLowerCase()}.html"` : "inline");
  res.send(html);
}));

router.get("/export/:category", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { salonId, startDate, endDate } = req.query as Record<string, string>;
  const period = startDate && endDate ? "CUSTOM" : "30d";
  const format = (req.query.format as string) || "CSV";

  let data: Record<string, unknown>;

  switch (category) {
    case "revenue": data = (await getRevenueAnalytics(salonId, period)) as unknown as Record<string, unknown>; break;
    case "salon": data = salonId ? (await getSalonAnalytics(salonId, period)) as unknown as Record<string, unknown> : { error: "salonId required" }; break;
    case "customers": data = (await getCustomerAnalytics(salonId, period)) as unknown as Record<string, unknown>; break;
    case "marketing": data = (await getMarketingAnalytics(period)) as unknown as Record<string, unknown>; break;
    default: throw new ApiError(400, "Invalid category. Use: revenue, salon, customers, marketing");
  }

  if (format === "JSON") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${category}_${period}.json"`);
    return res.send(toJSON(data));
  }

  const csvData = Object.entries(data).flatMap(([key, value]) => {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
      const headers = Object.keys(value[0]);
      const rows = value.map((r: Record<string, unknown>) => headers.map((h) => String(r[h] ?? "")));
      return [headers.join(","), ...rows.map((r) => r.join(","))];
    }
    return [`${key},${JSON.stringify(value)}`];
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${category}_${period}.csv"`);
  res.send(csvData.join("\n"));
}));

export default router;
