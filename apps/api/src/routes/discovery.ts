import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/recommendations", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const [preferences, history, recentlyViewed, favorites, allCategories] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.booking.findMany({ where: { userId, status: { in: ["COMPLETED", "CONFIRMED"] } }, include: { items: { include: { service: { select: { id: true, name: true, categoryId: true } } } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.recentlyViewed.findMany({ where: { userId }, orderBy: { viewedAt: "desc" }, take: 10, include: { salon: { include: { images: { take: 1, orderBy: { sort: "asc" } } } } } }),
    prisma.favorite.findMany({ where: { userId }, include: { salon: { include: { images: { take: 1, orderBy: { sort: "asc" } } } } }, take: 10 }),
    prisma.category.findMany({ take: 10 }),
  ]);

  const categoryIds = new Set<string>();
  const preferredCategories = preferences?.favoriteCategories ? JSON.parse(preferences.favoriteCategories) : [];
  preferredCategories.forEach((c: string) => categoryIds.add(c));
  history.forEach((b) => b.items.forEach((i) => { if (i.service?.categoryId) categoryIds.add(i.service.categoryId); }));
  const favoriteSalonIds = favorites.map((f) => f.salonId);
  const viewedSalonIds = recentlyViewed.map((r) => r.salonId);

  const salonMatchers: object[] = [];
  if (categoryIds.size) salonMatchers.push({ categories: { some: { categoryId: { in: Array.from(categoryIds) } } } });
  if (favoriteSalonIds.length || viewedSalonIds.length) salonMatchers.push({ id: { in: [...favoriteSalonIds, ...viewedSalonIds] } });

  const [recommended, trending] = await Promise.all([
    prisma.salon.findMany({
      where: {
        verified: true,
        ...(salonMatchers.length ? { OR: salonMatchers } : {}),
      },
      include: { area: { include: { city: true } }, images: { take: 1, orderBy: { sort: "asc" } }, _count: { select: { bookings: true, reviews: true } } },
      orderBy: { rating: "desc" },
      take: 20,
    }),
    prisma.salon.findMany({ where: { verified: true, trending: true }, include: { area: { include: { city: true } }, images: { take: 1, orderBy: { sort: "asc" } } }, take: 10 }),
  ]);

  res.json({ recommended, trending, recentlyViewed: recentlyViewed.map((r) => ({ ...r.salon, viewedAt: r.viewedAt })), favorites });
}));

router.get("/feed", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const [preferences, history, recentlyViewed, favorites] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.booking.findMany({ where: { userId, status: { not: "CANCELLED" } }, include: { salon: { include: { images: { take: 1, orderBy: { sort: "asc" } } } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.recentlyViewed.findMany({ where: { userId }, orderBy: { viewedAt: "desc" }, take: 8, include: { salon: { include: { images: { take: 1, orderBy: { sort: "asc" } } } } } }),
    prisma.favorite.findMany({ where: { userId }, include: { salon: { include: { images: { take: 1, orderBy: { sort: "asc" } }, _count: { select: { reviews: true } } } } }, take: 10 }),
  ]);

  const favCatIds = preferences?.favoriteCategories ? JSON.parse(preferences.favoriteCategories) : [];
  const [trending, offers] = await Promise.all([
    prisma.salon.findMany({ where: { verified: true, trending: true }, include: { area: { include: { city: true } }, images: { take: 1 } }, take: 10 }),
    prisma.salon.findMany({ where: { verified: true, featured: true }, include: { area: { include: { city: true } }, images: { take: 1 } }, take: 6 }),
  ]);

  res.json({
    sections: [
      { id: "continue_booking", label: "Continue Booking", items: history.filter((b) => b.status === "PENDING") },
      { id: "favorites", label: "Your Favorites", items: favorites },
      { id: "recently_viewed", label: "Recently Viewed", items: recentlyViewed.map((r) => r.salon) },
      { id: "trending", label: "Trending Near You", items: trending },
      { id: "featured", label: "Featured Offers", items: offers },
      { id: "recommended", label: "Recommended For You", items: [] },
    ],
  });
}));

router.get("/recently-viewed", requireAuth, asyncHandler(async (req, res) => {
  const items = await prisma.recentlyViewed.findMany({
    where: { userId: req.user!.id },
    orderBy: { viewedAt: "desc" },
    take: 20,
    include: { salon: { include: { images: { take: 1, orderBy: { sort: "asc" } }, area: { include: { city: true } } } } },
  });
  res.json({ items });
}));

router.post("/recently-viewed", requireAuth, asyncHandler(async (req, res) => {
  const { salonId } = req.body || {};
  if (!salonId) return res.status(400).json({ error: "salonId required" });
  await prisma.recentlyViewed.upsert({
    where: { userId_salonId: { userId: req.user!.id, salonId } },
    update: { viewedAt: new Date() },
    create: { userId: req.user!.id, salonId },
  });
  res.json({ success: true });
}));

router.get("/saved-searches", requireAuth, asyncHandler(async (req, res) => {
  const searches = await prisma.savedSearch.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ searches });
}));

router.post("/saved-searches", requireAuth, asyncHandler(async (req, res) => {
  const { query, filters, name, notify } = req.body || {};
  const search = await prisma.savedSearch.create({
    data: { userId: req.user!.id, query: query || "", filters: filters ? JSON.stringify(filters) : null, name, notify: notify || false },
  });
  res.status(201).json({ search });
}));

router.delete("/saved-searches/:id", requireAuth, asyncHandler(async (req, res) => {
  await prisma.savedSearch.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
  res.json({ success: true });
}));

router.get("/price-alerts", requireAuth, asyncHandler(async (req, res) => {
  const alerts = await prisma.priceAlert.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ alerts });
}));

router.post("/price-alerts", requireAuth, asyncHandler(async (req, res) => {
  const { salonId, serviceId, targetPrice } = req.body || {};
  const alert = await prisma.priceAlert.create({
    data: { userId: req.user!.id, salonId, serviceId, targetPrice },
  });
  res.status(201).json({ alert });
}));

router.delete("/price-alerts/:id", requireAuth, asyncHandler(async (req, res) => {
  await prisma.priceAlert.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
  res.json({ success: true });
}));

router.get("/preferences", requireAuth, asyncHandler(async (req, res) => {
  let pref = await prisma.userPreference.findUnique({ where: { userId: req.user!.id } });
  if (!pref) {
    pref = await prisma.userPreference.create({ data: { userId: req.user!.id } });
  }
  res.json({ preferences: pref });
}));

router.put("/preferences", requireAuth, asyncHandler(async (req, res) => {
  const data = req.body || {};
  const pref = await prisma.userPreference.upsert({
    where: { userId: req.user!.id },
    update: { favoriteCategories: data.favoriteCategories ? JSON.stringify(data.favoriteCategories) : undefined, favoriteServices: data.favoriteServices ? JSON.stringify(data.favoriteServices) : undefined, priceMin: data.priceMin, priceMax: data.priceMax, preferredCity: data.preferredCity, preferredArea: data.preferredArea, preferredGender: data.preferredGender, homeService: data.homeService },
    create: { userId: req.user!.id, favoriteCategories: "[]", favoriteServices: "[]" },
  });
  res.json({ preferences: pref });
}));

router.get("/search-history", requireAuth, asyncHandler(async (req, res) => {
  const history = await prisma.searchHistory.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  res.json({ history });
}));

router.delete("/search-history", requireAuth, asyncHandler(async (req, res) => {
  await prisma.searchHistory.deleteMany({ where: { userId: req.user!.id } });
  res.json({ success: true });
}));

router.get("/continue-booking", requireAuth, asyncHandler(async (req, res) => {
  const drafts = await prisma.continueBooking.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: "desc" },
  });
  const salons = drafts.length
    ? await prisma.salon.findMany({
        where: { id: { in: drafts.map((d) => d.salonId) } },
        include: { area: { include: { city: true } }, images: { take: 1, orderBy: { sort: "asc" } } },
      })
    : [];
  const salonById = new Map(salons.map((s) => [s.id, s]));
  res.json({
    drafts: drafts.map((d) => ({ ...d, services: JSON.parse(d.services), salon: salonById.get(d.salonId) ?? null })),
  });
}));

router.put("/continue-booking", requireAuth, asyncHandler(async (req, res) => {
  const { salonId, services, staffId, date, notes, step } = req.body || {};
  if (!salonId || !Array.isArray(services)) {
    return res.status(400).json({ error: "salonId and services array are required" });
  }
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true } });
  if (!salon) return res.status(404).json({ error: "Salon not found" });
  const draft = await prisma.continueBooking.upsert({
    where: { userId_salonId: { userId: req.user!.id, salonId } },
    update: {
      services: JSON.stringify(services),
      staffId: staffId ?? null,
      date: date ? new Date(date) : null,
      notes: notes ?? null,
      step: typeof step === "number" ? step : undefined,
    },
    create: {
      userId: req.user!.id,
      salonId,
      services: JSON.stringify(services),
      staffId: staffId ?? null,
      date: date ? new Date(date) : null,
      notes: notes ?? null,
      step: typeof step === "number" ? step : 1,
    },
  });
  res.json({ draft: { ...draft, services: JSON.parse(draft.services) } });
}));

router.delete("/continue-booking/:salonId", requireAuth, asyncHandler(async (req, res) => {
  await prisma.continueBooking.deleteMany({ where: { userId: req.user!.id, salonId: req.params.salonId } });
  res.json({ success: true });
}));

export default router;
