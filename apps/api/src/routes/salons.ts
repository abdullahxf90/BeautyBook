import { Router } from "express";
import { z } from "zod";
import { Prisma, prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { getValidated, validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import { config } from "../config";

const router = Router();

const listSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  category: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  gender: z.enum(["MALE", "FEMALE", "UNISEX"]).optional(),
  premium: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  trending: z.coerce.boolean().optional(),
  homeService: z.coerce.boolean().optional(),
  sort: z.enum(["rating", "price", "popularity", "newest"]).default("rating"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

router.get("/", validate(listSchema, "query"), asyncHandler(async (req, res) => {
  const f = getValidated<z.infer<typeof listSchema>>(req);

  const where: Prisma.SalonWhereInput = { listed: true };
  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
      { services: { some: { name: { contains: f.q, mode: "insensitive" } } } },
    ];
  }
  if (f.city) where.area = { city: { name: { equals: f.city, mode: "insensitive" } } };
  if (f.area) where.area = { ...(where.area as object), name: { equals: f.area, mode: "insensitive" } };
  if (f.category) where.services = { some: { category: { slug: f.category }, active: true } };
  if (f.minRating !== undefined) where.rating = { gte: f.minRating };
  if (f.maxPrice !== undefined) where.priceFrom = { lte: f.maxPrice };
  if (f.gender) where.gender = { in: [f.gender, "UNISEX"] };
  if (f.premium) where.premium = true;
  if (f.featured) where.featured = true;
  if (f.trending) where.trending = true;
  if (f.homeService) where.homeService = true;

  const orderBy: Prisma.SalonOrderByWithRelationInput =
    f.sort === "price" ? { priceFrom: "asc" }
    : f.sort === "popularity" ? { reviewCount: "desc" }
    : f.sort === "newest" ? { createdAt: "desc" }
    : { rating: "desc" };

  const [total, salons] = await Promise.all([
    prisma.salon.count({ where }),
    prisma.salon.findMany({
      where,
      orderBy,
      skip: (f.page - 1) * f.limit,
      take: f.limit,
      include: {
        area: { include: { city: true } },
        images: { orderBy: { sort: "asc" }, take: 1 },
      },
    }),
  ]);

  res.json({
    salons,
    pagination: { page: f.page, limit: f.limit, total, pages: Math.ceil(total / f.limit) },
  });
}));

router.get("/:slug", asyncHandler(async (req, res) => {
  const salon = await prisma.salon.findUnique({
    where: { slug: req.params.slug },
    include: {
      area: { include: { city: true } },
      images: { orderBy: { sort: "asc" } },
      services: { where: { active: true }, include: { category: true }, orderBy: { price: "asc" } },
      packages: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: { services: { include: { service: { select: { id: true, name: true, price: true, durationMin: true } } } } },
      },
      employees: { where: { active: true } },
      workingHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });
  if (!salon) throw new ApiError(404, "Salon not found");
  res.json({ salon });
}));

router.get("/:slug/reviews", asyncHandler(async (req, res) => {
  const salon = await prisma.salon.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
  if (!salon) throw new ApiError(404, "Salon not found");
  const reviews = await prisma.review.findMany({
    where: { salonId: salon.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });
  res.json({ reviews });
}));

const slotsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string(),
  employeeId: z.string().optional(),
});

router.get("/:slug/slots", validate(slotsSchema, "query"), asyncHandler(async (req, res) => {
  const { date, serviceId, employeeId } = getValidated<z.infer<typeof slotsSchema>>(req);
  const salon = await prisma.salon.findUnique({
    where: { slug: req.params.slug },
    include: { workingHours: true },
  });
  if (!salon) throw new ApiError(404, "Salon not found");
  const service = await prisma.service.findFirst({ where: { id: serviceId, salonId: salon.id } });
  if (!service) throw new ApiError(404, "Service not found for this salon");

  const day = new Date(`${date}T00:00:00`);
  const hours = salon.workingHours.find((h) => h.dayOfWeek === day.getDay());
  if (!hours || hours.closed) return res.json({ slots: [] });

  const dayStart = new Date(day);
  const dayEnd = new Date(day);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const bookings = await prisma.booking.findMany({
    where: {
      salonId: salon.id,
      startAt: { gte: dayStart, lt: dayEnd },
      status: { in: ["PENDING", "CONFIRMED"] },
      ...(employeeId ? { employeeId } : {}),
    },
    select: { startAt: true, durationMin: true },
  });

  const now = new Date();
  const slots: string[] = [];
  const step = 30;
  for (let m = hours.openMin; m + service.durationMin <= hours.closeMin; m += step) {
    const start = new Date(day);
    start.setMinutes(m);
    if (start <= now) continue;
    const end = new Date(start.getTime() + service.durationMin * 60000);
    const clash = bookings.some((b) => {
      const bEnd = new Date(b.startAt.getTime() + b.durationMin * 60000);
      return start < bEnd && end > b.startAt;
    });
    if (!clash) {
      slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
  }
  res.json({ slots });
}));

router.get("/map-data", asyncHandler(async (req, res) => {
  const { city, area, lat, lng, radius } = req.query;
  const where: any = { listed: true, latitude: { not: null }, longitude: { not: null } };
  if (city) where.area = { city: { name: { equals: city as string, mode: "insensitive" } } };
  if (area) where.area = { name: { equals: area as string, mode: "insensitive" } };
  let salons = await prisma.salon.findMany({
    where,
    select: {
      id: true, name: true, slug: true, latitude: true, longitude: true,
      rating: true, priceFrom: true, verified: true,
      images: { take: 1, orderBy: { sort: "asc" }, select: { url: true } },
    },
    take: 200,
  });
  if (lat && lng && radius) {
    const latN = Number(lat), lngN = Number(lng), r = Number(radius);
    salons = salons.filter((s) => {
      if (s.latitude == null || s.longitude == null) return false;
      const dLat = ((s.latitude - latN) * Math.PI) / 180;
      const dLng = ((s.longitude - lngN) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((latN * Math.PI) / 180) * Math.cos((s.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= r;
    });
  }
  const markers = salons.map((s) => ({ ...s, image: s.images[0]?.url || null, images: undefined }));
  res.json({ markers, total: markers.length });
}));

// ── Partner salon registration ──────────────────

const registerSalonSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(2000),
  phone: z.string().min(10).max(16),
  address: z.string().min(5).max(300),
  areaId: z.string().min(1),
  email: z.string().email().optional(),
  gender: z.enum(["MALE", "FEMALE", "UNISEX"]).default("UNISEX"),
  homeService: z.boolean().optional(),
});

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

router.post("/register", requireAuth, validate(registerSalonSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof registerSalonSchema>>(req);
  const area = await prisma.area.findUnique({ where: { id: data.areaId }, include: { city: true } });
  if (!area) throw new ApiError(400, "Invalid area");

  const base = slugify(data.name) || "salon";
  let slug = base;
  for (let i = 2; await prisma.salon.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${i}`;
  }

  const salon = await prisma.salon.create({
    data: {
      slug,
      name: data.name,
      description: data.description,
      phone: data.phone,
      address: data.address,
      areaId: data.areaId,
      cityId: area.cityId,
      email: data.email,
      gender: data.gender,
      homeService: data.homeService ?? false,
      ownerId: req.user!.id,
      verified: false,
      listed: false, // hidden from search until an admin approves the application
    },
    include: { area: { include: { city: true } } },
  });

  // First salon upgrades a customer to a partner account; new tokens carry the new role
  let tokens: { accessToken: string; refreshToken: string } | undefined;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (user && user.role === "CUSTOMER") {
    await prisma.user.update({ where: { id: user.id }, data: { role: "OWNER" } });
    const accessToken = signAccessToken({ sub: user.id, role: "OWNER" });
    const refreshToken = signRefreshToken({ sub: user.id, role: "OWNER" });
    const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 3600 * 1000);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });
    tokens = { accessToken, refreshToken };
  }

  await prisma.notification.create({
    data: {
      userId: req.user!.id,
      title: "Partner application received",
      body: `${data.name} has been submitted for review. We'll notify you once it's approved and live.`,
      type: "SALON",
    },
  });
  await prisma.auditLog.create({
    data: { userId: req.user!.id, action: "SALON_REGISTERED", entity: "Salon", entityId: salon.id },
  });

  res.status(201).json({ salon, ...tokens });
}));

export default router;
