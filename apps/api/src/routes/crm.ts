import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

const customerListQuery = z.object({
  salonId: z.string(),
  search: z.string().optional(),
  tag: z.string().optional(),
  segment: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

router.get("/customers", validate(customerListQuery, "query"), asyncHandler(async (req, res) => {
  const { salonId, search, tag, segment, page, limit } = getValidated<z.infer<typeof customerListQuery>>(req);
  const where: Record<string, unknown> = { salonId };
  // search removed: CrmCustomer has no user relation for cross-table filtering
  if (tag) where.tags = { some: { tag: { name: tag } } };
  if (segment) where.segments = { some: { segment: { name: segment } } };
  const [customers, total] = await Promise.all([
    prisma.crmCustomer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { lastVisitAt: { sort: "desc", nulls: "last" } },
      include: {
        tags: { include: { tag: true } },
        segments: { include: { segment: true } },
        _count: { select: { notes: true, followups: true } },
      },
    }),
    prisma.crmCustomer.count({ where }),
  ]);
  res.json({ customers, total, page, limit, pages: Math.ceil(total / limit) });
}));

router.get("/customers/:id", asyncHandler(async (req, res) => {
  const customer = await prisma.crmCustomer.findUnique({
    where: { id: req.params.id },
    include: {
      tags: { include: { tag: true } },
      segments: { include: { segment: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true, avatarUrl: true } } } },
      birthdays: true,
      followups: { orderBy: { dueAt: "asc" } },
      history: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!customer) throw new ApiError(404, "Customer not found");
  res.json({ customer });
}));

const updateCustomerSchema = z.object({
  totalBookings: z.number().int().optional(),
  totalSpent: z.number().int().optional(),
  lastVisitAt: z.string().datetime().optional(),
});

router.put("/customers/:id", requireRole("OWNER", "ADMIN", "MANAGER"), validate(updateCustomerSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof updateCustomerSchema>>(req);
  const customer = await prisma.crmCustomer.update({
    where: { id: req.params.id },
    data: { ...data, ...(data.lastVisitAt ? { lastVisitAt: new Date(data.lastVisitAt) } : {}) },
  });
  res.json({ customer });
}));

router.get("/customers/:id/notes", asyncHandler(async (req, res) => {
  const notes = await prisma.crmNote.findMany({
    where: { crmCustomerId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  res.json({ notes });
}));

const noteSchema = z.object({
  content: z.string().min(1),
  type: z.enum(["GENERAL", "PREFERENCE", "COMPLAINT", "COMPLIMENT"]).optional(),
});

router.post("/customers/:id/notes", requireRole("OWNER", "ADMIN", "MANAGER"), validate(noteSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof noteSchema>>(req);
  const note = await prisma.crmNote.create({
    data: { crmCustomerId: req.params.id, authorId: req.user!.id, content: data.content, type: data.type ?? "GENERAL" },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
  res.status(201).json({ note });
}));

router.get("/customers/:id/birthdays", asyncHandler(async (req, res) => {
  const birthdays = await prisma.crmBirthday.findMany({ where: { crmCustomerId: req.params.id } });
  res.json({ birthdays });
}));

const birthdaySchema = z.object({
  date: z.string().datetime(),
  year: z.number().int().optional(),
  notes: z.string().optional(),
});

router.post("/customers/:id/birthdays", requireRole("OWNER", "ADMIN", "MANAGER"), validate(birthdaySchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof birthdaySchema>>(req);
  const birthday = await prisma.crmBirthday.create({
    data: { crmCustomerId: req.params.id, date: new Date(data.date), year: data.year, notes: data.notes },
  });
  res.status(201).json({ birthday });
}));

router.get("/customers/:id/followups", asyncHandler(async (req, res) => {
  const followups = await prisma.crmFollowUp.findMany({
    where: { crmCustomerId: req.params.id },
    orderBy: { dueAt: "asc" },
  });
  res.json({ followups });
}));

const followupSchema = z.object({
  note: z.string().min(1),
  dueAt: z.string().datetime(),
  assignedTo: z.string().optional(),
});

router.post("/customers/:id/followups", requireRole("OWNER", "ADMIN", "MANAGER"), validate(followupSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof followupSchema>>(req);
  const followup = await prisma.crmFollowUp.create({
    data: { crmCustomerId: req.params.id, note: data.note, dueAt: new Date(data.dueAt), assignedTo: data.assignedTo },
  });
  res.status(201).json({ followup });
}));

router.put("/followups/:id", requireRole("OWNER", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  const followup = await prisma.crmFollowUp.update({
    where: { id: req.params.id },
    data: { completedAt: new Date() },
  });
  res.json({ followup });
}));

router.get("/tags", asyncHandler(async (req, res) => {
  const { salonId } = req.query as { salonId?: string };
  if (!salonId) throw new ApiError(400, "salonId is required");
  const tags = await prisma.crmTag.findMany({ where: { salonId }, orderBy: { name: "asc" } });
  res.json({ tags });
}));

const tagSchema = z.object({
  salonId: z.string(),
  name: z.string().min(1).max(50),
  color: z.string().optional(),
});

router.post("/tags", requireRole("OWNER", "ADMIN", "MANAGER"), validate(tagSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof tagSchema>>(req);
  const tag = await prisma.crmTag.create({ data });
  res.status(201).json({ tag });
}));

router.delete("/tags/:id", requireRole("OWNER", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  await prisma.crmTag.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

const addTagSchema = z.object({ tagId: z.string() });

router.post("/customers/:id/tags", requireRole("OWNER", "ADMIN", "MANAGER"), validate(addTagSchema), asyncHandler(async (req, res) => {
  const { tagId } = getValidated<z.infer<typeof addTagSchema>>(req);
  const tag = await prisma.crmCustomerTag.create({
    data: { crmCustomerId: req.params.id, tagId },
    include: { tag: true },
  });
  res.status(201).json({ tag });
}));

router.delete("/customers/:id/tags/:tagId", requireRole("OWNER", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  const link = await prisma.crmCustomerTag.findFirst({
    where: { crmCustomerId: req.params.id, tagId: req.params.tagId },
  });
  if (!link) throw new ApiError(404, "Tag not found on customer");
  await prisma.crmCustomerTag.delete({ where: { id: link.id } });
  res.json({ ok: true });
}));

router.get("/segments", asyncHandler(async (req, res) => {
  const { salonId } = req.query as { salonId?: string };
  if (!salonId) throw new ApiError(400, "salonId is required");
  const segments = await prisma.crmSegment.findMany({
    where: { salonId },
    include: { _count: { select: { customers: true } } },
  });
  res.json({ segments });
}));

const segmentSchema = z.object({
  salonId: z.string(),
  name: z.string().min(1).max(100),
  rules: z.string(),
});

router.post("/segments", requireRole("OWNER", "ADMIN", "MANAGER"), validate(segmentSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof segmentSchema>>(req);
  const segment = await prisma.crmSegment.create({ data });
  res.status(201).json({ segment });
}));

const updateSegmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rules: z.string().optional(),
});

router.put("/segments/:id", requireRole("OWNER", "ADMIN", "MANAGER"), validate(updateSegmentSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof updateSegmentSchema>>(req);
  const segment = await prisma.crmSegment.update({ where: { id: req.params.id }, data });
  res.json({ segment });
}));

router.delete("/segments/:id", requireRole("OWNER", "ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  await prisma.crmSegment.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

router.get("/customers/:id/history", asyncHandler(async (req, res) => {
  const history = await prisma.crmHistory.findMany({
    where: { crmCustomerId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ history });
}));

const campaignSchema = z.object({
  salonId: z.string(),
  name: z.string().min(1).max(200),
  segmentId: z.string().optional(),
  message: z.string().min(1),
  channel: z.enum(["IN_APP", "PUSH", "EMAIL", "SMS"]),
  scheduledAt: z.string().datetime().optional(),
});

router.post("/campaigns", requireRole("OWNER", "ADMIN"), validate(campaignSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof campaignSchema>>(req);
  const campaign = await prisma.crmCampaign.create({
    data: {
      salonId: data.salonId,
      name: data.name,
      segmentId: data.segmentId,
      message: data.message,
      channel: data.channel,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    },
  });
  res.status(201).json({ campaign });
}));

const campaignListQuery = z.object({
  salonId: z.string(),
  status: z.string().optional(),
});

router.get("/campaigns", validate(campaignListQuery, "query"), asyncHandler(async (req, res) => {
  const { salonId, status } = getValidated<z.infer<typeof campaignListQuery>>(req);
  const campaigns = await prisma.crmCampaign.findMany({
    where: { salonId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { segment: true },
  });
  res.json({ campaigns });
}));

export default router;
