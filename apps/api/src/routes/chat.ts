import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

const conversationIncludes = {
  participant: { select: { id: true, name: true, avatarUrl: true } },
  salon: { select: { id: true, name: true, slug: true } },
} as const;

const messageIncludes = {
  sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
} as const;

const startConversationSchema = z.object({
  salonId: z.string(),
  initialMessage: z.string().min(1).max(1000).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(["TEXT", "IMAGE", "FILE"]).default("TEXT"),
  attachmentUrl: z.string().url().optional(),
});

router.get("/conversations", asyncHandler(async (req, res) => {
  const { salonId } = req.query as { salonId?: string };
  const where: Record<string, unknown> = { participantId: req.user!.id };
  if (salonId) where.salonId = salonId;
  const conversations = await prisma.conversation.findMany({
    where,
    include: conversationIncludes,
    orderBy: { updatedAt: "desc" },
  });
  res.json({ conversations });
}));

router.post("/conversations", validate(startConversationSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof startConversationSchema>>(req);
  const salon = await prisma.salon.findUnique({ where: { id: data.salonId }, select: { id: true } });
  if (!salon) throw new ApiError(404, "Salon not found");
  const conversation = await prisma.conversation.create({
    data: {
      salonId: data.salonId,
      participantId: req.user!.id,
      lastMessageAt: data.initialMessage ? new Date() : undefined,
      messages: data.initialMessage
        ? { create: { senderId: req.user!.id, content: data.initialMessage } }
        : undefined,
    },
    include: conversationIncludes,
  });
  res.status(201).json({ conversation });
}));

router.get("/conversations/:id", asyncHandler(async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: {
      ...conversationIncludes,
      messages: { orderBy: { createdAt: "asc" }, take: 50, include: messageIncludes },
    },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");
  if (conversation.participantId !== req.user!.id && req.user!.role !== "ADMIN") throw new ApiError(403, "Not a participant");
  res.json({ conversation });
}));

router.get("/conversations/:id/messages", asyncHandler(async (req, res) => {
  const { cursor, limit } = req.query as { cursor?: string; limit?: string };
  const take = Math.min(parseInt(limit || "50", 10), 100);
  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!conversation) throw new ApiError(404, "Conversation not found");
  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.id },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: messageIncludes,
  });
  const hasMore = messages.length > take;
  const data = hasMore ? messages.slice(0, take) : messages;
  res.json({ messages: data.reverse(), nextCursor: hasMore ? data[0]?.id : null });
}));

router.post("/conversations/:id/messages", validate(sendMessageSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof sendMessageSchema>>(req);
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    select: { id: true, participantId: true, salonId: true },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");
  if (conversation.participantId !== req.user!.id && conversation.salonId !== req.user!.id) {
    // Allow salon staff and the participant to send messages
    const isStaff = await prisma.staff.findFirst({ where: { salonId: conversation.salonId, userId: req.user!.id } });
    if (!isStaff && conversation.participantId !== req.user!.id) throw new ApiError(403, "Not a participant");
  }
  const message = await prisma.message.create({
    data: {
      conversationId: req.params.id,
      senderId: req.user!.id,
      content: data.content,
      type: data.type,
    },
    include: messageIncludes,
  });
  await prisma.conversation.update({
    where: { id: req.params.id },
    data: { lastMessageAt: new Date() },
  });
  res.status(201).json({ message });
}));

router.delete("/messages/:id", asyncHandler(async (req, res) => {
  const message = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!message) throw new ApiError(404, "Message not found");
  if (message.senderId !== req.user!.id && req.user!.role !== "ADMIN") {
    throw new ApiError(403, "Cannot delete this message");
  }
  await prisma.message.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

router.put("/conversations/:id/read", asyncHandler(async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    select: { id: true, participantId: true },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");
  if (conversation.participantId !== req.user!.id) throw new ApiError(403, "Not a participant");
  const unreadMessages = await prisma.message.findMany({
    where: { conversationId: req.params.id, senderId: { not: req.user!.id } },
    select: { id: true },
  });
  await prisma.readReceipt.createMany({
    data: unreadMessages.map((m) => ({ messageId: m.id, userId: req.user!.id })),
    skipDuplicates: true,
  });
  res.json({ ok: true });
}));

router.get("/unread-count", asyncHandler(async (req, res) => {
  const conversationIds = await prisma.conversation.findMany({
    where: { participantId: req.user!.id },
    select: { id: true },
  });
  const count = await prisma.message.count({
    where: {
      conversationId: { in: conversationIds.map((c) => c.id) },
      senderId: { not: req.user!.id },
      readReceipts: { none: { userId: req.user!.id } },
    },
  });
  res.json({ unreadCount: count });
}));

export default router;
