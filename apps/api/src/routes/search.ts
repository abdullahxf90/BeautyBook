import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";

const router = Router();

router.get("/suggestions", asyncHandler(async (req, res) => {
  const q = (req.query.q as string) || "";
  if (q.length < 2) return res.json({ suggestions: [], salons: [], services: [] });

  const [salons, services, categories] = await Promise.all([
    prisma.salon.findMany({
      where: { name: { contains: q, mode: "insensitive" }, verified: true },
      take: 5, select: { slug: true, name: true, area: { select: { name: true, city: { select: { name: true } } } } },
    }),
    prisma.service.findMany({
      where: { name: { contains: q, mode: "insensitive" }, active: true },
      take: 5, select: { name: true, salon: { select: { slug: true, name: true } } },
    }),
    prisma.category.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 3, select: { name: true, slug: true },
    }),
  ]);

  res.json({ suggestions: [], salons, services, categories });
}));

router.get("/trending", asyncHandler(async (_req, res) => {
  const trending = await prisma.searchHistory.groupBy({
    by: ["query"], _count: { query: true },
    orderBy: { _count: { query: "desc" } },
    take: 10,
  });
  res.json({ trending: trending.map(t => ({ query: t.query, count: t._count.query })) });
}));

router.get("/by-time", asyncHandler(async (req, res) => {
  const { date, startTime, endTime, city, area, serviceId } = req.query as Record<string, string | undefined>;

  if (!date || !startTime || !endTime) {
    return res.status(400).json({ error: "date, startTime, and endTime are required" });
  }

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  if (startMin >= endMin) {
    return res.status(400).json({ error: "endTime must be after startTime" });
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return res.status(400).json({ error: "Invalid date" });
  }
  const dayOfWeek = dateObj.getDay();

  const salonWhere: any = { verified: true };
  if (city) {
    salonWhere.area = { ...(salonWhere.area || {}), city: { name: city } };
  }
  if (area) {
    salonWhere.area = { ...(salonWhere.area || {}), name: area };
  }
  if (serviceId) {
    salonWhere.services = { some: { id: serviceId } };
  }

  const salons = await prisma.salon.findMany({
    where: {
      ...salonWhere,
      workingHours: {
        some: {
          dayOfWeek,
          closed: false,
          openMin: { lte: startMin },
          closeMin: { gte: endMin },
        },
      },
    },
    include: {
      area: { include: { city: true } },
      staff: {
        where: { active: true },
        include: {
          availability: {
            where: { dayOfWeek, active: true },
          },
          bookings: {
            where: {
              startAt: {
                gte: new Date(`${date}T${startTime}:00`),
                lt: new Date(`${date}T${endTime}:00`),
              },
              status: { notIn: ["CANCELLED", "NO_SHOW"] },
            },
          },
        },
      },
      bookings: {
        where: {
          startAt: {
            gte: new Date(`${date}T${startTime}:00`),
            lt: new Date(`${date}T${endTime}:00`),
          },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
        select: { id: true, staffId: true },
      },
    },
    orderBy: { rating: "desc" },
    take: 20,
  });

  const slots = salons
    .map((salon) => {
      const hasSalonWideBooking = salon.bookings.some((b) => !b.staffId);
      if (hasSalonWideBooking) return null;

      const availableStaff = salon.staff.filter((staff) => {
        const avail = staff.availability[0];
        if (!avail) return false;
        if (avail.startMin > startMin || avail.endMin < endMin) return false;
        return staff.bookings.length === 0;
      });

      if (availableStaff.length === 0) return null;

      return {
        salon: {
          id: salon.id,
          slug: salon.slug,
          name: salon.name,
          rating: salon.rating,
          reviewCount: salon.reviewCount,
          priceFrom: salon.priceFrom,
          premium: salon.premium,
          area: { name: salon.area.name, city: { name: salon.area.city.name } },
        },
        staffAvailable: availableStaff.length,
        nextSlot: startTime,
      };
    })
    .filter(Boolean);

  res.json({ slots });
}));

export default router;
