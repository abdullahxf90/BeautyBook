import { prisma } from "@beautybook/database";
import { logger } from "./logger";

// ── Event Tracking ──────────────────────────────

export interface TrackEventInput {
  userId?: string;
  salonId?: string;
  event: string;
  category?: string;
  label?: string;
  value?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function trackEvent(input: TrackEventInput) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        userId: input.userId,
        salonId: input.salonId,
        event: input.event,
        category: input.category,
        label: input.label,
        value: input.value,
        sessionId: input.sessionId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        data: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch {
    // Event tracking failures are non-critical
  }
}

export async function trackEventSync(
  userId: string | undefined,
  event: string,
  metadata?: Record<string, unknown>,
) {
  setImmediate(() => {
    trackEvent({ userId, event, metadata }).catch(() => {});
  });
}

// ── Period Helpers ──────────────────────────────

export function periodToDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "7d": start.setDate(start.getDate() - 7); break;
    case "30d": start.setMonth(start.getMonth() - 1); break;
    case "90d": start.setMonth(start.getMonth() - 3); break;
    case "1y": start.setFullYear(start.getFullYear() - 1); break;
  }
  return { start, end };
}

export function dateRangeFromParams(startStr?: string, endStr?: string) {
  const end = endStr ? new Date(endStr) : new Date();
  const start = startStr ? new Date(startStr) : new Date(end.getTime() - 30 * 86400000);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date range");
  }
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export function groupByPeriod<T extends { date: Date; value: number }>(
  items: T[],
  period: "day" | "week" | "month" | "quarter" | "year",
): Array<{ period: string; count: number; value: number }> {
  const map = new Map<string, { count: number; value: number }>();
  for (const item of items) {
    const d = item.date;
    let key: string;
    switch (period) {
      case "day": key = d.toISOString().slice(0, 10); break;
      case "week": { const w = new Date(d); w.setDate(w.getDate() - w.getDay()); key = w.toISOString().slice(0, 10); break; }
      case "month": key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; break;
      case "quarter": key = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`; break;
      case "year": key = `${d.getFullYear()}`; break;
    }
    const entry = map.get(key) || { count: 0, value: 0 };
    entry.count++;
    entry.value += item.value;
    map.set(key, entry);
  }
  return Array.from(map.entries()).map(([period, stats]) => ({ period, ...stats }));
}

// ── Customer Analytics ──────────────────────────

export interface CustomerAnalyticsResult {
  totalCustomers: number;
  activeToday: number;
  activeThisMonth: number;
  newThisPeriod: number;
  repeatRate: number;
  avgSpend: number;
  avgFrequency: number;
  churnRate: number;
  retentionRate: number;
  lifetimeValue: number;
  topCategories: Array<{ category: string; count: number }>;
  topServices: Array<{ service: string; count: number }>;
  bySegment: Record<string, number>;
}

export async function getCustomerAnalytics(salonId?: string, period = "30d"): Promise<CustomerAnalyticsResult> {
  const { start, end } = periodToDateRange(period);
  const rangeWhere = { ...(salonId ? { salonId } : {}), startAt: { gte: start, lte: end } };
  const allWhere = salonId ? { salonId } : {};

  const [totalCustomers, activeToday, activeThisMonth, bookingUsers, newUsers, allBookings, userMetrics] = await Promise.all([
    prisma.user.count({ where: { status: { not: "DELETED" } } }),
    prisma.analyticsEvent.count({ where: { event: "user_active", createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.analyticsEvent.count({ where: { event: "user_active", createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    prisma.booking.groupBy({ by: ["userId"], where: rangeWhere, _count: { id: true }, _sum: { total: true } }),
    prisma.booking.groupBy({ by: ["userId"], where: { ...rangeWhere, createdAt: { gte: start } }, _count: { id: true } }),
    prisma.booking.aggregate({ where: rangeWhere, _avg: { total: true } }),
    prisma.userMetric.findMany({ where: { userId: { not: undefined } }, select: { segment: true, churnRisk: true, totalSpent: true, totalBookings: true, lifetimeDays: true }, take: 10000 }),
  ]);

  const repeatCustomers = bookingUsers.filter((u) => u._count.id > 1).length;
  const repeatRate = bookingUsers.length > 0 ? (repeatCustomers / bookingUsers.length) * 100 : 0;
  const avgSpend = bookingUsers.length > 0 ? bookingUsers.reduce((s, u) => s + (u._sum.total ?? 0), 0) / bookingUsers.length : 0;
  const avgFrequency = bookingUsers.length > 0 ? bookingUsers.reduce((s, u) => s + u._count.id, 0) / bookingUsers.length : 0;
  const atRisk = userMetrics.filter((m) => m.churnRisk > 0.5).length;
  const churnRate = userMetrics.length > 0 ? (atRisk / userMetrics.length) * 100 : 0;

  const segments: Record<string, number> = {};
  for (const m of userMetrics) {
    segments[m.segment] = (segments[m.segment] || 0) + 1;
  }

  const lifetimeValue = userMetrics.length > 0
    ? userMetrics.reduce((s, m) => s + m.totalSpent, 0) / userMetrics.length
    : 0;

  return {
    totalCustomers,
    activeToday,
    activeThisMonth,
    newThisPeriod: newUsers.length,
    repeatRate: Math.round(repeatRate * 10) / 10,
    avgSpend: Math.round(avgSpend),
    avgFrequency: Math.round(avgFrequency * 10) / 10,
    churnRate: Math.round(churnRate * 10) / 10,
    retentionRate: Math.round((1 - churnRate / 100) * 1000) / 10,
    lifetimeValue: Math.round(lifetimeValue),
    topCategories: [],
    topServices: [],
    bySegment: segments,
  };
}

// ── Salon Analytics ─────────────────────────────

export interface SalonAnalyticsResult {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  totalRevenue: number;
  avgRating: number;
  reviewCount: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  avgBookingValue: number;
  staffUtilization: number;
  peakHour: number;
  peakDay: number;
  conversionRate: number;
  growthRate: number;
  popularServices: Array<{ name: string; bookings: number; revenue: number }>;
  revenueByDay: Array<{ day: string; revenue: number }>;
  bookingByHour: Array<{ hour: number; count: number }>;
}

export async function getSalonAnalytics(salonId: string, period = "30d"): Promise<SalonAnalyticsResult> {
  const { start, end } = periodToDateRange(period);
  const where = { salonId, startAt: { gte: start, lte: end } };

  const [bookings, revenue, rating, customers, staffCount, allBookings] = await Promise.all([
    prisma.booking.findMany({ where, select: { id: true, status: true, total: true, startAt: true, durationMin: true, staffId: true, employeeId: true } }),
    prisma.booking.aggregate({ where, _sum: { total: true } }),
    prisma.review.aggregate({ where: { salonId }, _avg: { rating: true }, _count: { id: true } }),
    prisma.booking.groupBy({ by: ["userId"], where, _count: { id: true } }),
    prisma.staff.count({ where: { salonId, active: true } }),
    prisma.booking.findMany({ where: { salonId }, select: { startAt: true, total: true }, orderBy: { startAt: "asc" } }),
  ]);
  const services = await prisma.bookingItem.groupBy({
    by: ["name"],
    where: { booking: { salonId, startAt: { gte: start, lte: end } } },
    _count: { id: true },
    _sum: { price: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const cancelled = bookings.filter((b) => b.status === "CANCELLED");
  const noShows = bookings.filter((b) => b.status === "NO_SHOW");

  const repeatCustomers = customers.filter((c) => (c._count?.id ?? 0) > 1).length;
  const avgBookingValue = completed.length > 0 ? completed.reduce((s, b) => s + b.total, 0) / completed.length : 0;
  const totalSlots = staffCount * 26 * (parseInt(period) || 30) / 30;
  const staffUtil = totalSlots > 0 ? (bookings.length / totalSlots) * 100 : 0;

  const hourCounts: Record<number, number> = {};
  const dayRevenue: Record<string, number> = {};
  for (const b of bookings) {
    const h = b.startAt.getHours();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
    const day = b.startAt.toLocaleDateString("en-US", { weekday: "short" });
    dayRevenue[day] = (dayRevenue[day] || 0) + b.total;
  }

  let peakHour = 0, peakHourCount = 0;
  for (const [h, c] of Object.entries(hourCounts)) {
    if (c > peakHourCount) { peakHour = parseInt(h); peakHourCount = c; }
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayCounts: Record<number, number> = {};
  for (const b of bookings) {
    const d = b.startAt.getDay();
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  }
  let peakDay = 0, peakDayCount = 0;
  for (const [d, c] of Object.entries(dayCounts)) {
    if (c > peakDayCount) { peakDay = parseInt(d); peakDayCount = c; }
  }

  const totalUnique = customers.length;
  const conversionRate = totalUnique > 0 ? (completed.length / bookings.filter((b) => b.status !== "CANCELLED").length) * 100 : 0;

  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - (parseInt(period) || 30));
  const prevBookings = await prisma.booking.count({ where: { salonId, startAt: { gte: prevStart, lte: start } } });
  const prevTotal = await prisma.booking.aggregate({ where: { salonId, startAt: { gte: prevStart, lte: start } }, _sum: { total: true } });
  const growth = prevBookings > 0 ? ((bookings.length - prevBookings) / prevBookings) * 100 : 0;

  return {
    totalBookings: bookings.length,
    completedBookings: completed.length,
    cancelledBookings: cancelled.length,
    noShowBookings: noShows.length,
    totalRevenue: revenue._sum.total ?? 0,
    avgRating: rating._avg.rating ?? 0,
    reviewCount: rating._count.id,
    uniqueCustomers: totalUnique,
    repeatCustomers,
    avgBookingValue: Math.round(avgBookingValue),
    staffUtilization: Math.round(staffUtil),
    peakHour,
    peakDay,
    conversionRate: Math.round(conversionRate * 10) / 10,
    growthRate: Math.round(growth * 10) / 10,
    popularServices: services.map((s) => ({ name: s.name, bookings: s._count?.id ?? 0, revenue: s._sum?.price ?? 0 })),
    revenueByDay: Object.entries(dayRevenue).map(([day, revenue]) => ({ day, revenue })),
    bookingByHour: Object.entries(hourCounts).map(([hour, count]) => ({ hour: parseInt(hour), count })),
  };
}

// ── City Analytics ──────────────────────────────

export interface CityAnalyticsResult {
  city: string;
  totalSalons: number;
  activeSalons: number;
  totalBookings: number;
  totalRevenue: number;
  newUsers: number;
  growthRate: number;
  marketShare: number;
}

export async function getCityAnalytics(period = "30d"): Promise<CityAnalyticsResult[]> {
  const { start, end } = periodToDateRange(period);
  const cities = await prisma.area.findMany({
    include: { city: true, salons: { include: { _count: { select: { bookings: { where: { startAt: { gte: start, lte: end } } } } } } } },
  });

  const cityMap = new Map<string, CityAnalyticsResult>();
  for (const area of cities) {
    const cityName = area.city?.name || "Unknown";
    const existing = cityMap.get(cityName) || { city: cityName, totalSalons: 0, activeSalons: 0, totalBookings: 0, totalRevenue: 0, newUsers: 0, growthRate: 0, marketShare: 0 };
    existing.totalSalons += area.salons.length;

    for (const salon of area.salons) {
      existing.totalBookings += salon._count.bookings;
    }

    cityMap.set(cityName, existing);
  }

  const totalBookingsAll = Array.from(cityMap.values()).reduce((s, c) => s + c.totalBookings, 0);
  return Array.from(cityMap.values()).map((c) => ({
    ...c,
    marketShare: totalBookingsAll > 0 ? Math.round((c.totalBookings / totalBookingsAll) * 1000) / 10 : 0,
  })).sort((a, b) => b.totalBookings - a.totalBookings);
}

// ── Revenue Analytics ───────────────────────────

export interface RevenueAnalyticsResult {
  daily: Array<{ date: string; revenue: number; bookings: number }>;
  weekly: Array<{ week: string; revenue: number; bookings: number }>;
  monthly: Array<{ month: string; revenue: number; bookings: number }>;
  totals: { revenue: number; bookings: number; avgOrder: number; refunds: number };
  byMethod: Array<{ method: string; revenue: number; count: number }>;
}

export async function getRevenueAnalytics(salonId?: string, period = "30d"): Promise<RevenueAnalyticsResult> {
  const { start, end } = periodToDateRange(period);
  const where: Record<string, unknown> = { startAt: { gte: start, lte: end } };
  if (salonId) where.salonId = salonId;

  const bookings = await prisma.booking.findMany({
    where, orderBy: { startAt: "asc" },
    select: { startAt: true, total: true, status: true, paymentMethod: true },
  });

  const dailyMap = new Map<string, { revenue: number; bookings: number }>();
  const weeklyMap = new Map<string, { revenue: number; bookings: number }>();
  const monthlyMap = new Map<string, { revenue: number; bookings: number }>();
  const methodMap = new Map<string, { revenue: number; count: number }>();

  let totalRefunds = 0;
  for (const b of bookings) {
    if (b.status === "CANCELLED") continue;
    const dayKey = b.startAt.toISOString().slice(0, 10);
    const d = new Date(dayKey); d.setDate(d.getDate() - d.getDay());
    const weekKey = d.toISOString().slice(0, 10);
    const monthKey = `${b.startAt.getFullYear()}-${String(b.startAt.getMonth() + 1).padStart(2, "0")}`;

    for (const [map, key] of [[dailyMap, dayKey], [weeklyMap, weekKey], [monthlyMap, monthKey]] as const) {
      const entry = map.get(key) || { revenue: 0, bookings: 0 };
      entry.revenue += b.total;
      entry.bookings++;
      map.set(key, entry);
    }

    const mEntry = methodMap.get(b.paymentMethod) || { revenue: 0, count: 0 };
    mEntry.revenue += b.total;
    mEntry.count++;
    methodMap.set(b.paymentMethod, mEntry);
  }

  const totalRevenue = bookings.reduce((s, b) => s + b.total, 0);
  const totalBookings = bookings.length;

  return {
    daily: Array.from(dailyMap.entries()).map(([date, stats]) => ({ date, ...stats })),
    weekly: Array.from(weeklyMap.entries()).map(([week, stats]) => ({ week, ...stats })),
    monthly: Array.from(monthlyMap.entries()).map(([month, stats]) => ({ month, ...stats })),
    totals: {
      revenue: totalRevenue,
      bookings: totalBookings,
      avgOrder: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0,
      refunds: totalRefunds,
    },
    byMethod: Array.from(methodMap.entries()).map(([method, stats]) => ({ method, ...stats })),
  };
}

// ── Marketing Analytics ─────────────────────────

export interface MarketingAnalyticsResult {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  totalRevenue: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgConversionRate: number;
  byChannel: Array<{ channel: string; sent: number; opened: number; clicked: number; converted: number }>;
}

export async function getMarketingAnalytics(period = "30d"): Promise<MarketingAnalyticsResult> {
  const { start, end } = periodToDateRange(period);
  const metrics = await prisma.marketingMetric.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });

  const channelMap = new Map<string, { sent: number; opened: number; clicked: number; converted: number }>();
  for (const m of metrics) {
    const entry = channelMap.get(m.channel) || { sent: 0, opened: 0, clicked: 0, converted: 0 };
    entry.sent += m.sent;
    entry.opened += m.opened;
    entry.clicked += m.clicked;
    entry.converted += m.converted;
    channelMap.set(m.channel, entry);
  }

  const totalSent = metrics.reduce((s, m) => s + m.sent, 0);
  const totalOpened = metrics.reduce((s, m) => s + m.opened, 0);
  const totalClicked = metrics.reduce((s, m) => s + m.clicked, 0);
  const totalConverted = metrics.reduce((s, m) => s + m.converted, 0);
  const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0);

  return {
    totalSent,
    totalOpened,
    totalClicked,
    totalConverted,
    totalRevenue,
    avgOpenRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0,
    avgClickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 1000) / 10 : 0,
    avgConversionRate: totalSent > 0 ? Math.round((totalConverted / totalSent) * 1000) / 10 : 0,
    byChannel: Array.from(channelMap.entries()).map(([channel, stats]) => ({ channel, ...stats })),
  };
}

// ── Funnel Analytics ────────────────────────────

export interface FunnelResult {
  name: string;
  count: number;
  conversion: number;
  dropoff: number;
}

export async function getFunnel(salonId?: string, period = "30d"): Promise<FunnelResult[]> {
  const { start, end } = periodToDateRange(period);
  const where: Record<string, unknown> = { createdAt: { gte: start, lte: end } };
  if (salonId) where.salonId = salonId;

  const steps = await prisma.funnelStep.findMany({ where: { active: true }, orderBy: { order: "asc" } });
  if (steps.length === 0) return [];

  const results: FunnelResult[] = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const count = await prisma.analyticsEvent.count({ where: { event: step.eventName, ...where } });
    const prevCount = i > 0 ? results[i - 1].count : count;
    results.push({
      name: step.name,
      count,
      conversion: prevCount > 0 ? Math.round((count / prevCount) * 1000) / 10 : 0,
      dropoff: i > 0 ? Math.round(((prevCount - count) / prevCount) * 1000) / 10 : 0,
    });
  }

  return results;
}

// ── Forecasting ─────────────────────────────────

export interface ForecastPoint {
  date: string;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export function generateForecast(
  historicalData: Array<{ date: Date; value: number }>,
  periods: number,
  periodType: "day" | "week" | "month" = "day",
): ForecastPoint[] {
  if (historicalData.length < 3) return [];

  const values = historicalData.map((d) => d.value);
  const n = values.length;

  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  let trend = 0;
  if (n > 1) {
    const xMean = (n - 1) / 2;
    const xDiff = values.reduce((s, v, i) => s + (i - xMean) * (v - mean), 0);
    const xSqDiff = values.reduce((s, v, i) => s + (i - xMean) ** 2, 0);
    trend = xSqDiff > 0 ? xDiff / xSqDiff : 0;
  }

  const lastValue = values[n - 1];
  const lastDate = historicalData[n - 1].date;
  const points: ForecastPoint[] = [];

  for (let i = 1; i <= periods; i++) {
    const nextDate = new Date(lastDate);
    if (periodType === "day") nextDate.setDate(nextDate.getDate() + i);
    else if (periodType === "week") nextDate.setDate(nextDate.getDate() + i * 7);
    else nextDate.setMonth(nextDate.getMonth() + i);

    const predicted = Math.max(0, lastValue + trend * i);
    const interval = stdDev * 1.96 * Math.sqrt(1 + 1 / n + (i * i) / (n * (n - 1)));

    points.push({
      date: nextDate.toISOString().slice(0, 10),
      predicted: Math.round(predicted),
      lowerBound: Math.max(0, Math.round(predicted - interval)),
      upperBound: Math.round(predicted + interval),
    });
  }

  return points;
}

export async function generateAndSaveForecast(
  type: string,
  entityId?: string,
  entityType?: string,
  periods = 30,
): Promise<ForecastPoint[]> {
  let historicalData: Array<{ date: Date; value: number }> = [];

  const dateField = type === "REVENUE" || type === "BOOKINGS" ? "startAt" : "createdAt";

  if (type === "REVENUE") {
    const where: Record<string, unknown> = { status: "COMPLETED" };
    if (entityId && entityType === "SALON") where.salonId = entityId;
    const bookings = await prisma.booking.findMany({
      where, orderBy: { startAt: "asc" },
      select: { startAt: true, total: true },
      take: 365,
    });
    historicalData = bookings.map((b) => ({ date: b.startAt, value: b.total }));
  } else if (type === "BOOKINGS") {
    const where: Record<string, unknown> = {};
    if (entityId && entityType === "SALON") where.salonId = entityId;
    const bookings = await prisma.booking.findMany({
      where, orderBy: { startAt: "asc" },
      select: { startAt: true },
      take: 365,
    });
    dailyMap: {
      const daily = new Map<string, number>();
      for (const b of bookings) {
        const key = b.startAt.toISOString().slice(0, 10);
        daily.set(key, (daily.get(key) || 0) + 1);
      }
      historicalData = Array.from(daily.entries()).map(([date, count]) => ({ date: new Date(date), value: count }));
    }
  } else if (type === "CUSTOMERS") {
    const users = await prisma.user.findMany({
      where: { status: { not: "DELETED" } }, orderBy: { createdAt: "asc" },
      select: { createdAt: true }, take: 365,
    });
    const daily = new Map<string, number>();
    for (const u of users) {
      const key = u.createdAt.toISOString().slice(0, 10);
      daily.set(key, (daily.get(key) || 0) + 1);
    }
    historicalData = Array.from(daily.entries()).map(([date, count]) => ({ date: new Date(date), value: count }));
  }

  const points = generateForecast(historicalData.sort((a, b) => a.date.getTime() - b.date.getTime()), periods);

  if (points.length > 0) {
    const existing = await prisma.forecast.findFirst({ where: { type, entityId: entityId || null, entityType: entityType || null } });
    if (existing) {
      await prisma.forecast.update({
        where: { id: existing.id },
        data: { points: JSON.stringify(points), accuracy: null, generatedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) },
      });
    } else {
      await prisma.forecast.create({
        data: {
          type,
          metric: type.toLowerCase(),
          entityId,
          entityType,
          period: periods > 60 ? "MONTHLY" : "DAILY",
          model: "EXPONENTIAL_SMOOTHING",
          points: JSON.stringify(points),
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
    }
  }

  return points;
}

// ── Cohorts ─────────────────────────────────────

export interface CohortRow {
  cohort: string;
  intervals: number[];
  size: number;
}

export async function generateCohortAnalysis(period: "weekly" | "monthly" = "monthly", intervals = 12): Promise<CohortRow[]> {
  const users = await prisma.user.findMany({
    where: { status: { not: "DELETED" } },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const bookings = await prisma.booking.findMany({
    select: { userId: true, startAt: true },
    where: { status: "COMPLETED" },
  });

  const userCohortMap = new Map<string, string>();
  for (const user of users) {
    const d = user.createdAt;
    const key = period === "monthly"
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : (() => { const w = new Date(d); w.setDate(w.getDate() - w.getDay()); return w.toISOString().slice(0, 10); })();
    userCohortMap.set(user.id, key);
  }

  const bookingCohorts = new Map<string, Map<number, Set<string>>>();
  for (const booking of bookings) {
    const cohortKey = userCohortMap.get(booking.userId);
    if (!cohortKey) continue;
    const bookingDate = booking.startAt;
    const userDate = users.find((u) => u.id === booking.userId)?.createdAt;
    if (!userDate) continue;
    const interval = period === "monthly"
      ? (bookingDate.getFullYear() - userDate.getFullYear()) * 12 + bookingDate.getMonth() - userDate.getMonth()
      : Math.floor((bookingDate.getTime() - userDate.getTime()) / (7 * 86400000));
    if (interval < 0 || interval >= intervals) continue;

    if (!bookingCohorts.has(cohortKey)) bookingCohorts.set(cohortKey, new Map());
    const intervalMap = bookingCohorts.get(cohortKey)!;
    if (!intervalMap.has(interval)) intervalMap.set(interval, new Set());
    intervalMap.get(interval)!.add(booking.userId);
  }

  const sortedCohorts = Array.from(bookingCohorts.entries()).sort(([a], [b]) => a.localeCompare(b));

  const results: CohortRow[] = sortedCohorts.map(([cohort, intervalMap]) => {
    const cohortUsers = users.filter((u) => {
      const d = u.createdAt;
      const key = period === "monthly"
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : (() => { const w = new Date(d); w.setDate(w.getDate() - w.getDay()); return w.toISOString().slice(0, 10); })();
      return key === cohort;
    });
    const size = cohortUsers.length;
    const firstIntervalUsers = intervalMap.get(0)?.size || 0;
    const intervals_data: number[] = [];
    for (let i = 0; i < intervals; i++) {
      const usersInInterval = intervalMap.get(i)?.size || 0;
      intervals_data.push(firstIntervalUsers > 0 ? Math.round((usersInInterval / size) * 1000) / 10 : 0);
    }
    return { cohort, intervals: intervals_data, size };
  });

  if (results.length > 0) {
    await prisma.cohort.create({
      data: {
        type: "CUSTOMER",
        name: `Customer Retention (${period})`,
        period: period.toUpperCase(),
        startDate: new Date(),
        intervals,
        data: JSON.stringify(results),
      },
    });
  }

  return results;
}

// ── Revenue Forecasting ─────────────────────────

export async function getRevenueForecast(salonId?: string, months = 3): Promise<{ historical: Array<{ month: string; revenue: number }>; forecast: ForecastPoint[] }> {
  const start = new Date();
  start.setMonth(start.getMonth() - 12);
  const where: Record<string, unknown> = { status: "COMPLETED", startAt: { gte: start } };
  if (salonId) where.salonId = salonId;

  const bookings = await prisma.booking.findMany({
    where, orderBy: { startAt: "asc" },
    select: { startAt: true, total: true },
  });

  const monthlyMap = new Map<string, number>();
  for (const b of bookings) {
    const key = `${b.startAt.getFullYear()}-${String(b.startAt.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + b.total);
  }

  const historical = Array.from(monthlyMap.entries())
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const historicalData = historical.map((h) => ({ date: new Date(h.month + "-01"), value: h.revenue }));
  const forecast = generateForecast(historicalData, months, "month");

  return { historical, forecast };
}

// ── Customer Lifetime Value ─────────────────────

export async function calculateLTV(userId: string): Promise<{ ltv: number; totalSpent: number; totalBookings: number; lifetimeDays: number; predictedValue: number }> {
  const bookings = await prisma.booking.findMany({
    where: { userId, status: "COMPLETED" },
    select: { total: true, startAt: true },
    orderBy: { startAt: "asc" },
  });

  const totalSpent = bookings.reduce((s, b) => s + b.total, 0);
  const totalBookings = bookings.length;
  const lifetimeDays = bookings.length > 0
    ? Math.round((Date.now() - bookings[0].startAt.getTime()) / 86400000) + 1
    : 1;
  const avgPerVisit = totalBookings > 0 ? totalSpent / totalBookings : 0;
  const monthlyFrequency = lifetimeDays > 30 ? (totalBookings / lifetimeDays) * 30 : 1;
  const predictedValue = avgPerVisit * monthlyFrequency * 12;

  return { ltv: Math.round(totalSpent), totalSpent, totalBookings, lifetimeDays, predictedValue: Math.round(predictedValue) };
}

// ── Aggregation Jobs ────────────────────────────

export async function computeDailyStats(date: Date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const [totalBookings, completedBookings, cancelledBookings, revenue, newUsers, newSalons, views, searches] = await Promise.all([
    prisma.booking.count({ where: { startAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.booking.count({ where: { startAt: { gte: dayStart, lte: dayEnd }, status: "COMPLETED" } }),
    prisma.booking.count({ where: { startAt: { gte: dayStart, lte: dayEnd }, status: "CANCELLED" } }),
    prisma.booking.aggregate({ where: { startAt: { gte: dayStart, lte: dayEnd } }, _sum: { total: true } }),
    prisma.user.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.salon.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.analyticsEvent.count({ where: { event: "salon_view", createdAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.analyticsEvent.count({ where: { event: "search", createdAt: { gte: dayStart, lte: dayEnd } } }),
  ]);

  await prisma.dailyStatistic.upsert({
    where: { date_salonId: { date: dayStart, salonId: "" } },
    update: {
      totalBookings, completedBookings, cancelledBookings,
      revenue: revenue._sum.total ?? 0,
      newUsers, newSalons, totalViews: views, totalSearches: searches,
    },
    create: {
      date: dayStart, totalBookings, completedBookings, cancelledBookings,
      revenue: revenue._sum.total ?? 0,
      newUsers, newSalons, totalViews: views, totalSearches: searches,
    },
  });
}

export async function computeUserMetrics() {
  const users = await prisma.user.findMany({
    where: { status: { not: "DELETED" } },
    select: { id: true, createdAt: true, loyaltyPoints: true },
  });

  const bookings = await prisma.booking.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) } },
    _count: { id: true },
    _sum: { total: true },
    _avg: { total: true },
  });

  const bookingMap = new Map(bookings.map((b) => [b.userId, b]));

  for (const user of users) {
    const stats = bookingMap.get(user.id);
    const totalBookings = stats?._count.id ?? 0;
    const totalSpent = stats?._sum.total ?? 0;
    const lastBooking = await prisma.booking.findFirst({
      where: { userId: user.id, status: "COMPLETED" },
      orderBy: { startAt: "desc" },
      select: { startAt: true },
    });

    const lifetimeDays = Math.round((Date.now() - user.createdAt.getTime()) / 86400000) + 1;
    const daysSinceLastBooking = lastBooking ? Math.round((Date.now() - lastBooking.startAt.getTime()) / 86400000) : lifetimeDays;

    let segment = "NEW";
    if (totalBookings === 0) segment = "NEW";
    else if (daysSinceLastBooking > 90) segment = "CHURNED";
    else if (daysSinceLastBooking > 30) segment = "AT_RISK";
    else if (totalBookings > 10 && totalSpent > 50000) segment = "VIP";
    else segment = "ACTIVE";

    const churnRisk = Math.min(1, daysSinceLastBooking / 180);

    await prisma.userMetric.upsert({
      where: { userId: user.id },
      update: {
        totalBookings,
        completedBookings: totalBookings,
        totalSpent,
        avgBookingValue: totalBookings > 0 ? Math.round(totalSpent / totalBookings) : 0,
        avgBookingsPerMonth: lifetimeDays > 0 ? Math.round((totalBookings / lifetimeDays) * 30 * 10) / 10 : 0,
        lastBookingAt: lastBooking?.startAt ?? null,
        lifetimeDays,
        churnRisk,
        segment,
        calculatedAt: new Date(),
      },
      create: {
        userId: user.id,
        totalBookings,
        completedBookings: totalBookings,
        totalSpent,
        avgBookingValue: totalBookings > 0 ? Math.round(totalSpent / totalBookings) : 0,
        avgBookingsPerMonth: lifetimeDays > 0 ? Math.round((totalBookings / lifetimeDays) * 30 * 10) / 10 : 0,
        firstBookingAt: null,
        lastBookingAt: lastBooking?.startAt ?? null,
        lifetimeDays,
        churnRisk,
        segment,
        calculatedAt: new Date(),
      },
    });
  }
}

export async function computeSalonMetrics() {
  const salons = await prisma.salon.findMany({ select: { id: true } });
  for (const salon of salons) {
    const analytics = await getSalonAnalytics(salon.id);
    await prisma.salonMetric.upsert({
      where: { salonId: salon.id },
      update: {
        totalBookings: analytics.totalBookings,
        completedBookings: analytics.completedBookings,
        cancelledBookings: analytics.cancelledBookings,
        noShowBookings: analytics.noShowBookings,
        totalRevenue: analytics.totalRevenue,
        avgRating: analytics.avgRating,
        reviewCount: analytics.reviewCount,
        uniqueCustomers: analytics.uniqueCustomers,
        repeatCustomers: analytics.repeatCustomers,
        avgBookingValue: analytics.avgBookingValue,
        staffUtilization: analytics.staffUtilization,
        peakHour: analytics.peakHour,
        peakDay: analytics.peakDay,
        conversionRate: analytics.conversionRate,
        growthRate: analytics.growthRate,
        calculatedAt: new Date(),
      },
      create: {
        salonId: salon.id,
        totalBookings: analytics.totalBookings,
        completedBookings: analytics.completedBookings,
        cancelledBookings: analytics.cancelledBookings,
        noShowBookings: analytics.noShowBookings,
        totalRevenue: analytics.totalRevenue,
        avgRating: analytics.avgRating,
        reviewCount: analytics.reviewCount,
        uniqueCustomers: analytics.uniqueCustomers,
        repeatCustomers: analytics.repeatCustomers,
        avgBookingValue: analytics.avgBookingValue,
        staffUtilization: analytics.staffUtilization,
        peakHour: analytics.peakHour,
        peakDay: analytics.peakDay,
        conversionRate: analytics.conversionRate,
        growthRate: analytics.growthRate,
        calculatedAt: new Date(),
      },
    });
  }
}

// ── Data Export ─────────────────────────────────

export function toCSV(headers: string[], rows: string[][]): string {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export function toJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export async function generateReportHtml(data: Record<string, unknown>, title: string): Promise<string> {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body { font-family: 'Manrope', sans-serif; color: #1C1C1C; background: #FAF8F7; padding: 40px; max-width: 900px; margin: auto; }
h1 { font-family: 'Cormorant Garamond', serif; font-size: 36px; border-bottom: 2px solid #B06A85; padding-bottom: 12px; }
h2 { font-family: 'Cormorant Garamond', serif; font-size: 24px; margin-top: 32px; color: #B06A85; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; }
th { background: #B06A85; color: white; padding: 8px 12px; text-align: left; }
td { padding: 8px 12px; border-bottom: 1px solid #E8E0DC; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin: 24px 0; }
.kpi { background: white; border: 1px solid #E8E0DC; border-radius: 8px; padding: 20px; text-align: center; }
.kpi-value { font-size: 28px; font-weight: 700; color: #B06A85; }
.kpi-label { font-size: 12px; text-transform: uppercase; color: #888; margin-top: 4px; }
.footer { margin-top: 48px; font-size: 12px; color: #888; text-align: center; }
</style></head><body>
<h1>${title}</h1>
<p>Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
${Object.entries(data).map(([key, value]) => {
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
    const cols = Object.keys(value[0]);
    return `<h2>${key}</h2><table><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>${value.map((row: Record<string, unknown>) => `<tr>${cols.map((c) => `<td>${row[c] ?? ""}</td>`).join("")}</tr>`).join("")}</table>`;
  }
  return "";
}).join("")}
<div class="footer">BeautyBook — Business Intelligence Report</div>
</body></html>`.trim();
}
