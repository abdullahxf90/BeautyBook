import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();
router.use(requireAuth);

const createTicketSchema = z.object({
  subject: z.string().min(2).max(200),
  description: z.string().min(10).max(5000),
  category: z.enum(["GENERAL", "TECHNICAL", "BILLING", "FEATURE"]).default("GENERAL"),
});

const updateTicketSchema = z.object({
  subject: z.string().min(2).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
});

const messageSchema = z.object({
  content: z.string().min(1).max(5000),
});

const statusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]),
});

const prioritySchema = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

const assignSchema = z.object({
  assignedTo: z.string().min(1),
});

router.get("/tickets", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const { status, priority, category } = req.query;
  const where: Record<string, unknown> = { userId: req.user!.id };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.category = category;
  const [total, tickets] = await Promise.all([
    prisma.supportTicket.count({ where: where as any }),
    prisma.supportTicket.findMany({
      where: where as any,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  res.json({ tickets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.get("/tickets/:id", asyncHandler(async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: req.params.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.userId !== req.user!.id) throw new ApiError(404, "Ticket not found");
  res.json({ ticket });
}));

router.post("/tickets", validate(createTicketSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof createTicketSchema>>(req);
  const ticket = await prisma.supportTicket.create({
    data: { ...data, userId: req.user!.id },
  });
  res.status(201).json({ ticket });
}));

router.put("/tickets/:id", validate(updateTicketSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof updateTicketSchema>>(req);
  const existing = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) throw new ApiError(404, "Ticket not found");
  const ticket = await prisma.supportTicket.update({ where: { id: req.params.id }, data });
  res.json({ ticket });
}));

router.post("/tickets/:id/messages", validate(messageSchema), asyncHandler(async (req, res) => {
  const { content } = getValidated<z.infer<typeof messageSchema>>(req);
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket || ticket.userId !== req.user!.id) throw new ApiError(404, "Ticket not found");
  const message = await prisma.ticketMessage.create({
    data: { ticketId: req.params.id, userId: req.user!.id, content, isStaff: false },
  });
  res.status(201).json({ message });
}));

router.put("/tickets/:id/status", requireRole("ADMIN", "SUPER_ADMIN"), validate(statusSchema), asyncHandler(async (req, res) => {
  const { status } = getValidated<z.infer<typeof statusSchema>>(req);
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  const updated = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: { status, resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null },
  });
  res.json({ ticket: updated });
}));

router.put("/tickets/:id/priority", requireRole("ADMIN", "SUPER_ADMIN"), validate(prioritySchema), asyncHandler(async (req, res) => {
  const { priority } = getValidated<z.infer<typeof prioritySchema>>(req);
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  const updated = await prisma.supportTicket.update({ where: { id: req.params.id }, data: { priority } });
  res.json({ ticket: updated });
}));

router.put("/tickets/:id/assign", requireRole("ADMIN", "SUPER_ADMIN"), validate(assignSchema), asyncHandler(async (req, res) => {
  const { assignedTo } = getValidated<z.infer<typeof assignSchema>>(req);
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  const updated = await prisma.supportTicket.update({ where: { id: req.params.id }, data: { assignedTo } });
  res.json({ ticket: updated });
}));

router.post("/tickets/:id/staff-messages", requireRole("ADMIN", "SUPER_ADMIN"), validate(messageSchema), asyncHandler(async (req, res) => {
  const { content } = getValidated<z.infer<typeof messageSchema>>(req);
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  const [message] = await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId: req.params.id, userId: req.user!.id, content, isStaff: true },
    }),
    prisma.supportTicket.update({
      where: { id: req.params.id },
      data: {
        firstResponseAt: ticket.firstResponseAt ?? new Date(),
        status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
      },
    }),
  ]);
  res.status(201).json({ message });
}));

const satisfactionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

router.post("/tickets/:id/satisfaction", validate(satisfactionSchema), asyncHandler(async (req, res) => {
  const { rating, comment } = getValidated<z.infer<typeof satisfactionSchema>>(req);
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket || ticket.userId !== req.user!.id) throw new ApiError(404, "Ticket not found");
  if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") throw new ApiError(400, "Ticket must be resolved before rating");
  if (ticket.satisfactionRating != null) throw new ApiError(409, "Ticket already rated");
  const updated = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: { satisfactionRating: rating, satisfactionComment: comment ?? null },
  });
  res.json({ ticket: updated });
}));

router.get("/analytics", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (_req, res) => {
  const [byStatus, byPriority, byCategory, rated, timed] = await Promise.all([
    prisma.supportTicket.groupBy({ by: ["status"], _count: true }),
    prisma.supportTicket.groupBy({ by: ["priority"], _count: true }),
    prisma.supportTicket.groupBy({ by: ["category"], _count: true }),
    prisma.supportTicket.aggregate({ _avg: { satisfactionRating: true }, _count: { satisfactionRating: true } }),
    prisma.supportTicket.findMany({
      where: { OR: [{ firstResponseAt: { not: null } }, { resolvedAt: { not: null } }] },
      select: { createdAt: true, firstResponseAt: true, resolvedAt: true },
      take: 1000,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const avgMs = (pairs: Array<number | null>) => {
    const vals = pairs.filter((v): v is number => v != null && v >= 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  const firstResponseMs = avgMs(timed.map((t) => (t.firstResponseAt ? t.firstResponseAt.getTime() - t.createdAt.getTime() : null)));
  const resolutionMs = avgMs(timed.map((t) => (t.resolvedAt ? t.resolvedAt.getTime() - t.createdAt.getTime() : null)));
  res.json({
    byStatus,
    byPriority,
    byCategory,
    csat: { average: rated._avg.satisfactionRating, responses: rated._count.satisfactionRating },
    avgFirstResponseMs: firstResponseMs,
    avgResolutionMs: resolutionMs,
  });
}));

router.get("/health-scores", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [bookingGroups, openTickets, lowCsat] = await Promise.all([
    prisma.booking.groupBy({ by: ["userId", "status"], _count: true, where: { createdAt: { gte: since } } }),
    prisma.supportTicket.groupBy({ by: ["userId"], _count: true, where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.supportTicket.groupBy({ by: ["userId"], _avg: { satisfactionRating: true }, where: { satisfactionRating: { not: null } } }),
  ]);
  const stats = new Map<string, { total: number; cancelled: number; noShow: number; openTickets: number; csat: number | null }>();
  const get = (id: string) => {
    let s = stats.get(id);
    if (!s) { s = { total: 0, cancelled: 0, noShow: 0, openTickets: 0, csat: null }; stats.set(id, s); }
    return s;
  };
  for (const g of bookingGroups) {
    const s = get(g.userId);
    s.total += g._count;
    if (g.status === "CANCELLED") s.cancelled += g._count;
    if (g.status === "NO_SHOW") s.noShow += g._count;
  }
  for (const g of openTickets) get(g.userId).openTickets = g._count;
  for (const g of lowCsat) get(g.userId).csat = g._avg.satisfactionRating;
  // 100 = healthy; deductions for cancellations, no-shows, open tickets, poor CSAT
  const scored = Array.from(stats.entries()).map(([userId, s]) => {
    let score = 100;
    if (s.total > 0) score -= Math.round((s.cancelled / s.total) * 40 + (s.noShow / s.total) * 30);
    score -= Math.min(20, s.openTickets * 10);
    if (s.csat != null) score -= Math.round((5 - s.csat) * 5);
    return { userId, score: Math.max(0, score), ...s };
  }).sort((a, b) => a.score - b.score).slice(0, limit);
  const users = await prisma.user.findMany({
    where: { id: { in: scored.map((s) => s.userId) } },
    select: { id: true, name: true, email: true, loyaltyTier: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  res.json({ healthScores: scored.map((s) => ({ ...s, user: byId.get(s.userId) ?? null })) });
}));

export default router;
