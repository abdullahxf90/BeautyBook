import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";
import { z } from "zod";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

const searchSchema = z.object({
  q: z.string().optional().default(""),
  city: z.string().optional(),
  area: z.string().optional(),
  category: z.string().optional(),
  service: z.string().optional(),
  staff: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  gender: z.enum(["MALE", "FEMALE", "UNISEX"]).optional(),
  verified: z.coerce.boolean().optional(),
  premium: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  trending: z.coerce.boolean().optional(),
  homeService: z.coerce.boolean().optional(),
  openNow: z.coerce.boolean().optional(),
  availableToday: z.coerce.boolean().optional(),
  facilities: z.string().optional(),
  paymentMethod: z.string().optional(),
  sort: z.enum(["rating", "price_asc", "price_desc", "popularity", "newest", "distance", "reviewed"]).optional().default("rating"),
  distance: z.coerce.number().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  source: z.string().optional(),
  sessionId: z.string().optional(),
});

router.get("/", validate(searchSchema, "query"), asyncHandler(async (req, res) => {
  const f = getValidated<z.infer<typeof searchSchema>>(req);
  const startTime = Date.now();

  const where: any = {};
  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
      { services: { some: { name: { contains: f.q, mode: "insensitive" } } } },
      { employees: { some: { name: { contains: f.q, mode: "insensitive" } } } },
    ];
  }
  if (f.city) where.area = { city: { name: { equals: f.city, mode: "insensitive" } } };
  if (f.area) where.area = { ...(where.area || {}), name: { equals: f.area, mode: "insensitive" } };
  if (f.category) where.services = { some: { category: { slug: f.category }, active: true } };
  if (f.service) where.services = { some: { name: { contains: f.service, mode: "insensitive" }, active: true } };
  if (f.minRating) where.rating = { gte: f.minRating };
  if (f.minPrice) where.priceFrom = { gte: f.minPrice };
  if (f.maxPrice) where.priceFrom = { lte: f.maxPrice };
  if (f.gender) where.gender = { in: [f.gender, "UNISEX"] };
  if (f.verified) where.verified = true;
  if (f.premium) where.premium = true;
  if (f.featured) where.featured = true;
  if (f.trending) where.trending = true;
  if (f.homeService) where.homeService = true;

  const orderBy: any = f.sort === "price_asc" ? { priceFrom: "asc" }
    : f.sort === "price_desc" ? { priceFrom: "desc" }
    : f.sort === "popularity" ? { reviewCount: "desc" }
    : f.sort === "newest" ? { createdAt: "desc" }
    : f.sort === "reviewed" ? { reviewCount: "desc" }
    : { rating: "desc" };

  const page = Math.max(1, f.page);
  const limit = Math.min(50, Math.max(1, f.limit));

  const [total, salons] = await Promise.all([
    prisma.salon.count({ where }),
    prisma.salon.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        area: { include: { city: true } },
        images: { orderBy: { sort: "asc" }, take: 1 },
        _count: { select: { bookings: true, reviews: true } },
      },
    }),
  ]);

  if (f.q) {
    prisma.searchHistory.create({ data: { query: f.q, results: total, userId: req.user?.id } }).catch(() => {});
    prisma.searchAnalytics.create({ data: { query: f.q, resultsCount: total, userId: req.user?.id, filters: JSON.stringify(f), sessionId: f.sessionId, durationMs: Date.now() - startTime, source: f.source } }).catch(() => {});
    prisma.trendingSearch.upsert({
      where: { query: f.q },
      update: { count: { increment: 1 } },
      create: { query: f.q, count: 1, category: f.category, city: f.city },
    }).catch(() => {});
  }

  res.json({ salons, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.get("/suggestions", asyncHandler(async (req, res) => {
  const q = (req.query.q as string) || "";
  if (q.length < 2) return res.json({ suggestions: [], salons: [], services: [], staff: [], categories: [] });

  const [salons, services, categories, staff, trending] = await Promise.all([
    prisma.salon.findMany({ where: { name: { contains: q, mode: "insensitive" }, verified: true }, take: 5, select: { id: true, slug: true, name: true, rating: true, area: { select: { name: true, city: { select: { name: true } } } }, images: { take: 1, orderBy: { sort: "asc" }, select: { url: true } } } }),
    prisma.service.findMany({ where: { name: { contains: q, mode: "insensitive" }, active: true }, take: 5, select: { id: true, name: true, price: true, salon: { select: { slug: true, name: true } } } }),
    prisma.category.findMany({ where: { name: { contains: q, mode: "insensitive" } }, take: 3, select: { id: true, name: true, slug: true } }),
    prisma.employee.findMany({ where: { name: { contains: q, mode: "insensitive" }, active: true }, take: 3, select: { id: true, name: true, title: true, salon: { select: { slug: true, name: true } } } }),
    prisma.trendingSearch.findMany({ where: { query: { contains: q, mode: "insensitive" } }, orderBy: { count: "desc" }, take: 3, select: { query: true, count: true } }),
  ]);

  res.json({ suggestions: trending.map((t) => t.query), salons, services, categories, staff });
}));

router.get("/trending", asyncHandler(async (_req, res) => {
  const [fromHistory, fromTrending] = await Promise.all([
    prisma.searchHistory.groupBy({ by: ["query"], _count: { query: true }, orderBy: { _count: { query: "desc" } }, take: 10 }),
    prisma.trendingSearch.findMany({ orderBy: { count: "desc" }, take: 10, select: { query: true, count: true, category: true, city: true } }),
  ]);
  res.json({ trending: fromTrending.length ? fromTrending : fromHistory.map((t) => ({ query: t.query, count: t._count.query })) });
}));

router.get("/by-time", asyncHandler(async (req, res) => {
  const { date, startTime, endTime, city, area, serviceId } = req.query as Record<string, string | undefined>;
  if (!date || !startTime || !endTime) return res.status(400).json({ error: "date, startTime, and endTime are required" });

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  if (startMin >= endMin) return res.status(400).json({ error: "endTime must be after startTime" });
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return res.status(400).json({ error: "Invalid date" });
  const dayOfWeek = dateObj.getDay();

  const salonWhere: any = { verified: true };
  if (city) salonWhere.area = { ...(salonWhere.area || {}), city: { name: city } };
  if (area) salonWhere.area = { ...(salonWhere.area || {}), name: area };
  if (serviceId) salonWhere.services = { some: { id: serviceId } };

  const salons = await prisma.salon.findMany({
    where: { ...salonWhere, workingHours: { some: { dayOfWeek, closed: false, openMin: { lte: startMin }, closeMin: { gte: endMin } } } },
    include: {
      area: { include: { city: true } },
      images: { take: 1, orderBy: { sort: "asc" } },
      staff: { where: { active: true }, include: { availability: { where: { dayOfWeek, active: true } }, bookings: { where: { startAt: { gte: new Date(`${date}T${startTime}:00`), lt: new Date(`${date}T${endTime}:00`) }, status: { notIn: ["CANCELLED", "NO_SHOW"] } } } } },
      bookings: { where: { startAt: { gte: new Date(`${date}T${startTime}:00`), lt: new Date(`${date}T${endTime}:00`) }, status: { notIn: ["CANCELLED", "NO_SHOW"] } }, select: { id: true, staffId: true } },
    },
    orderBy: { rating: "desc" },
    take: 20,
  });

  const slots = salons.map((salon) => {
    const hasSalonWideBooking = salon.bookings.some((b) => !b.staffId);
    if (hasSalonWideBooking) return null;
    const availableStaff = salon.staff.filter((staff) => {
      const avail = staff.availability[0];
      if (!avail) return false;
      return avail.startMin <= startMin && avail.endMin >= endMin && staff.bookings.length === 0;
    });
    if (availableStaff.length === 0) return null;
    return {
      salon: { id: salon.id, slug: salon.slug, name: salon.name, rating: salon.rating, reviewCount: salon.reviewCount, priceFrom: salon.priceFrom, premium: salon.premium, image: salon.images[0]?.url || null, area: { name: salon.area.name, city: { name: salon.area.city.name } } },
      staffAvailable: availableStaff.length,
      nextSlot: startTime,
    };
  }).filter(Boolean);

  res.json({ slots });
}));

export default router;
