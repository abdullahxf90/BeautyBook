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

export default router;
