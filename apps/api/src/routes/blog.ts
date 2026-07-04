import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 12));
  const category = req.query.category as string;
  const where: Record<string, unknown> = { published: true };
  if (category) where.category = category;
  const [total, posts] = await Promise.all([
    prisma.blogPost.count({ where: where as any }),
    prisma.blogPost.findMany({
      where: where as any, orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
      select: { id: true, slug: true, title: true, excerpt: true, category: true, tags: true, coverUrl: true, authorName: true, readTimeMin: true, createdAt: true, featured: true },
    }),
  ]);
  res.json({ posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.get("/categories", asyncHandler(async (_req, res) => {
  const categories = await prisma.blogPost.findMany({
    where: { published: true },
    select: { category: true },
    distinct: ["category"],
  });
  res.json({ categories: categories.map(c => c.category) });
}));

router.get("/featured", asyncHandler(async (_req, res) => {
  const posts = await prisma.blogPost.findMany({
    where: { published: true, featured: true },
    orderBy: { createdAt: "desc" }, take: 3,
    select: { id: true, slug: true, title: true, excerpt: true, category: true, coverUrl: true, readTimeMin: true, createdAt: true },
  });
  res.json({ posts });
}));

router.get("/:slug", asyncHandler(async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug } });
  if (!post || !post.published) throw new ApiError(404, "Post not found");
  res.json({ post });
}));

// Admin
router.post("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), validate(z.object({
  slug: z.string().min(2), title: z.string().min(2).max(200),
  excerpt: z.string().min(10).max(500), content: z.string().min(50),
  category: z.string().default("general"), tags: z.array(z.string()).default([]),
  coverUrl: z.string().optional(), authorName: z.string().default("BeautyBook"),
  readTimeMin: z.number().int().min(1).default(5),
  published: z.boolean().default(false), featured: z.boolean().default(false),
})), asyncHandler(async (req, res) => {
  const data = getValidated<any>(req);
  const post = await prisma.blogPost.create({ data: { ...data, tags: JSON.stringify(data.tags) } });
  res.status(201).json({ post });
}));

router.patch("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const post = await prisma.blogPost.update({ where: { id: req.params.id }, data: req.body });
  res.json({ post });
}));

export default router;
