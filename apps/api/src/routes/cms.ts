import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

const pageSchema = z.object({
  slug: z.string().min(2).max(200),
  title: z.string().min(2).max(200),
  content: z.string().min(10),
  metaTitle: z.string().max(200).optional(),
  metaDesc: z.string().max(500).optional(),
  published: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const faqSchema = z.object({
  question: z.string().min(5).max(500),
  answer: z.string().min(10).max(5000),
  category: z.string().default("general"),
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(true),
});

const testimonialSchema = z.object({
  name: z.string().min(2).max(100),
  role: z.string().max(100).optional(),
  avatarUrl: z.string().optional(),
  content: z.string().min(10).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  salonId: z.string().optional(),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(true),
});

const bannerSchema = z.object({
  title: z.string().max(200).optional(),
  subtitle: z.string().max(500).optional(),
  imageUrl: z.string(),
  link: z.string().optional(),
  position: z.string().default("HOME_TOP"),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
});

const mediaSchema = z.object({
  url: z.string(),
  type: z.enum(["IMAGE", "VIDEO", "DOCUMENT"]),
  alt: z.string().max(500).optional(),
  size: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  folder: z.string().max(100).optional(),
});

const announcementSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(10).max(5000),
  imageUrl: z.string().optional(),
  link: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  active: z.boolean().default(true),
});

// ─── Pages ──────────────────────────────────────

router.get("/pages", asyncHandler(async (_req, res) => {
  const pages = await prisma.page.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json({ pages });
}));

router.get("/pages/:slug", asyncHandler(async (req, res) => {
  const page = await prisma.page.findUnique({ where: { slug: req.params.slug } });
  if (!page || !page.published) throw new ApiError(404, "Page not found");
  res.json({ page });
}));

router.post("/pages", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(pageSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof pageSchema>>(req);
  const page = await prisma.page.create({ data });
  res.status(201).json({ page });
}));

router.put("/pages/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(pageSchema.partial()), asyncHandler(async (req, res) => {
  const data = getValidated<Record<string, unknown>>(req);
  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Page not found");
  const page = await prisma.page.update({ where: { id: req.params.id }, data });
  res.json({ page });
}));

router.delete("/pages/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  await prisma.page.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ─── FAQs ───────────────────────────────────────

router.get("/faqs", asyncHandler(async (req, res) => {
  const { category } = req.query;
  const where: Record<string, unknown> = { published: true };
  if (category) where.category = category;
  const faqs = await prisma.faq.findMany({ where: where as any, orderBy: { sortOrder: "asc" } });
  res.json({ faqs });
}));

router.post("/faqs", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(faqSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof faqSchema>>(req);
  const faq = await prisma.faq.create({ data });
  res.status(201).json({ faq });
}));

router.put("/faqs/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(faqSchema.partial()), asyncHandler(async (req, res) => {
  const data = getValidated<Record<string, unknown>>(req);
  const existing = await prisma.faq.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "FAQ not found");
  const faq = await prisma.faq.update({ where: { id: req.params.id }, data });
  res.json({ faq });
}));

router.delete("/faqs/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  await prisma.faq.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ─── Testimonials ──────────────────────────────

router.get("/testimonials", asyncHandler(async (req, res) => {
  const { featured } = req.query;
  const where: Record<string, unknown> = { published: true };
  if (featured !== undefined) where.featured = featured === "true";
  const testimonials = await prisma.testimonial.findMany({ where: where as any, orderBy: { sortOrder: "asc" } });
  res.json({ testimonials });
}));

router.post("/testimonials", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(testimonialSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof testimonialSchema>>(req);
  const testimonial = await prisma.testimonial.create({ data });
  res.status(201).json({ testimonial });
}));

router.put("/testimonials/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(testimonialSchema.partial()), asyncHandler(async (req, res) => {
  const data = getValidated<Record<string, unknown>>(req);
  const existing = await prisma.testimonial.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Testimonial not found");
  const testimonial = await prisma.testimonial.update({ where: { id: req.params.id }, data });
  res.json({ testimonial });
}));

router.delete("/testimonials/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  await prisma.testimonial.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ─── Banners ────────────────────────────────────

router.get("/banners", asyncHandler(async (req, res) => {
  const { position } = req.query;
  const where: Record<string, unknown> = { active: true };
  if (position) where.position = position;
  const banners = await prisma.banner.findMany({ where: where as any, orderBy: { sortOrder: "asc" } });
  res.json({ banners });
}));

router.post("/banners", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(bannerSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof bannerSchema>>(req);
  const banner = await prisma.banner.create({
    data: { ...data, startAt: data.startAt ? new Date(data.startAt) : undefined, endAt: data.endAt ? new Date(data.endAt) : undefined },
  });
  res.status(201).json({ banner });
}));

router.put("/banners/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(bannerSchema.partial()), asyncHandler(async (req, res) => {
  const data = getValidated<Record<string, unknown>>(req);
  const existing = await prisma.banner.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Banner not found");
  const banner = await prisma.banner.update({ where: { id: req.params.id }, data });
  res.json({ banner });
}));

router.delete("/banners/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  await prisma.banner.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ─── Media Library ──────────────────────────────

router.get("/media", asyncHandler(async (req, res) => {
  const { folder, type } = req.query;
  const where: Record<string, unknown> = {};
  if (folder) where.folder = folder;
  if (type) where.type = type;
  const media = await prisma.media.findMany({ where: where as any, orderBy: { createdAt: "desc" } });
  res.json({ media });
}));

router.post("/media", requireAuth, validate(mediaSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof mediaSchema>>(req);
  const media = await prisma.media.create({ data: { ...data, userId: req.user!.id } });
  res.status(201).json({ media });
}));

router.delete("/media/:id", requireAuth, asyncHandler(async (req, res) => {
  await prisma.media.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ─── Announcements ──────────────────────────────

router.get("/announcements", asyncHandler(async (_req, res) => {
  const announcements = await prisma.announcement.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ announcements });
}));

router.post("/announcements", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(announcementSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof announcementSchema>>(req);
  const announcement = await prisma.announcement.create({
    data: { ...data, startAt: data.startAt ? new Date(data.startAt) : undefined, endAt: data.endAt ? new Date(data.endAt) : undefined },
  });
  res.status(201).json({ announcement });
}));

router.put("/announcements/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(announcementSchema.partial()), asyncHandler(async (req, res) => {
  const data = getValidated<Record<string, unknown>>(req);
  const existing = await prisma.announcement.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, "Announcement not found");
  const announcement = await prisma.announcement.update({ where: { id: req.params.id }, data });
  res.json({ announcement });
}));

export default router;
