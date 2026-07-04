import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

const suggestions = [
  "Looking for a bridal makeup artist in Karachi?",
  "Try a hydra facial for glowing skin this summer",
  "Best salons for gel nails in Lahore",
  "Affordable party makeup packages under Rs 5000",
  "Spa and massage deals in Islamabad this weekend",
  "Hair treatments for damaged hair - what salons recommend",
  "Top rated skincare clinics in DHA",
  "Wedding beauty packages - complete bridal grooming",
  "Best barbershops and men's grooming in Rawalpindi",
  "Organic and chemical-free beauty services near me",
];

const recommendations = [
  { category: "Facial", text: "Based on your interest in skincare, a hydrating facial might be perfect for you." },
  { category: "Bridal", text: "Planning a wedding? Our bridal packages include trial sessions." },
  { category: "Hair", text: "For hair concerns, salons with trichology services offer expert consultations." },
  { category: "Massage", text: "Aromatherapy massages help reduce stress - many salons offer package deals." },
  { category: "Makeup", text: "Professional makeup artists can create looks for any occasion." },
];

router.post("/suggest", asyncHandler(async (req, res) => {
  const { query } = req.body as { query?: string };
  if (!query || query.trim().length < 2) {
    return res.json({ suggestions: suggestions.slice(0, 5) });
  }
  const filtered = suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  if (filtered.length < 3) {
    const related = await prisma.salon.findMany({
      where: { OR: [{ name: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] },
      take: 3, select: { name: true, slug: true },
    });
    filtered.push(...related.map(r => `Visit ${r.name} for quality beauty services`));
  }
  res.json({ suggestions: filtered.slice(0, 5) });
}));

router.get("/trending", asyncHandler(async (_req, res) => {
  res.json({
    trending: [
      { query: "Bridal makeup", count: 1240 },
      { query: "Facial treatment", count: 980 },
      { query: "Hair coloring", count: 750 },
      { query: "Nail art", count: 620 },
      { query: "Massage therapy", count: 510 },
    ],
  });
}));

// AI conversation (store user queries for context)
router.post("/chat", requireAuth, asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body as { message?: string; conversationId?: string };
  if (!message) return res.json({ reply: "How can I help you with your beauty needs today?" });

  let conversation;
  if (conversationId) {
    conversation = await prisma.aIConversation.findUnique({ where: { id: conversationId } });
  }
  if (!conversation) {
    conversation = await prisma.aIConversation.create({ data: { userId: req.user!.id } });
  }

  await prisma.aIConversationMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: message },
  });

  const catMatch = message.match(/\b(hair|bridal|facial|nails|spa|massage|makeup|skin|skincare)\b/i);
  const cityMatch = message.match(/\b(Karachi|Lahore|Islamabad|Rawalpindi)\b/i);
  let reply = "";
  if (catMatch) {
    const cat = catMatch[0].toLowerCase();
    const city = cityMatch ? cityMatch[0] : "";
    const where: Record<string, unknown> = { services: { some: { category: { slug: cat.replace(/\s/g, "-") }, active: true } } };
    if (city) where.area = { city: { name: city } };
    const salons = await prisma.salon.findMany({ where: where as any, take: 3, orderBy: { rating: "desc" } });
    if (salons.length > 0) {
      reply = `Here are top-rated ${cat} service providers: ${salons.map(s => `${s.name} (★${s.rating})`).join(", ")}. `;
      reply += `Would you like to book an appointment or see their services?`;
    } else {
      reply = `I couldn't find ${cat} service providers${city ? ` in ${city}` : ""} at the moment. Try searching in a different city or category.`;
    }
  } else {
    const rc = recommendations[Math.floor(Math.random() * recommendations.length)];
    reply = `${rc.text} Would you like me to help you find specific services or salons?`;
  }

  await prisma.aIConversationMessage.create({
    data: { conversationId: conversation.id, role: "ASSISTANT", content: reply },
  });

  res.json({ reply, conversationId: conversation.id });
}));

router.get("/conversations", requireAuth, asyncHandler(async (req, res) => {
  const conversations = await prisma.aIConversation.findMany({
    where: { userId: req.user!.id },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    orderBy: { updatedAt: "desc" }, take: 10,
  });
  res.json({ conversations });
}));

export default router;
