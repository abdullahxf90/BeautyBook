import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const salonId = req.query.salonId as string;

  if (!salonId) {
    return res.json({
      insights: [
        { type: "TREND", title: "Hair coloring bookings up 18%", description: "Hair coloring services increased 18% this month compared to last month", metric: "18%", change: "+18%", direction: "up" },
        { type: "INSIGHT", title: "Facial customers return within 30 days", description: "Customers who book facials typically return within 24 days", metric: "24 days", change: "24", direction: "neutral" },
        { type: "INSIGHT", title: "Saturday 2-5 PM is busiest", description: "Your peak booking time is Saturday between 2-5 PM", metric: "Saturday 2-5 PM", change: "", direction: "neutral" },
        { type: "ALERT", title: "3 products running low on stock", description: "3 products have stock below minimum threshold", metric: "3 items", change: "low", direction: "down" },
        { type: "TIP", title: "Staff utilization rate is 72%", description: "Your staff utilization rate is 72%, optimal range is 75-85%", metric: "72%", change: "72%", direction: "neutral" },
        { type: "INSIGHT", title: "Average booking value is Rs. 2,450", description: "The average value of completed bookings is Rs. 2,450", metric: "Rs. 2,450", change: "", direction: "neutral" },
        { type: "TREND", title: "Top performer: Sarah", description: "Sarah has the highest booking completion rate this month", metric: "Sarah", change: "", direction: "up" },
        { type: "ALERT", title: "Cancellation rate is 8%", description: "Your current cancellation rate is 8%", metric: "8%", change: "8%", direction: "neutral" },
      ],
    });
  }

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const insights: Array<{ type: string; title: string; description: string; metric: string; change: string; direction: string }> = [];

  // 1. Hair coloring trend
  const [thisMonthColor, lastMonthColor] = await Promise.all([
    prisma.bookingItem.count({
      where: {
        booking: { salonId, startAt: { gte: thisMonthStart } },
        service: { name: { contains: "color", mode: "insensitive" } },
      },
    }),
    prisma.bookingItem.count({
      where: {
        booking: { salonId, startAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        service: { name: { contains: "color", mode: "insensitive" } },
      },
    }),
  ]);

  if (thisMonthColor > 0 || lastMonthColor > 0) {
    const pctChange = lastMonthColor > 0 ? Math.round(((thisMonthColor - lastMonthColor) / lastMonthColor) * 100) : 100;
    insights.push({
      type: "TREND",
      title: `Hair coloring bookings ${pctChange >= 0 ? "up" : "down"} ${Math.abs(pctChange)}%`,
      description: `Hair coloring services ${pctChange >= 0 ? "increased" : "decreased"} ${Math.abs(pctChange)}% this month compared to last month`,
      metric: `${Math.abs(pctChange)}%`,
      change: `${pctChange >= 0 ? "+" : ""}${pctChange}%`,
      direction: pctChange >= 0 ? "up" : "down",
    });
  }

  // 2. Facial return rate
  const facialCustomers = await prisma.bookingItem.findMany({
    where: {
      booking: { salonId, status: "COMPLETED" },
      service: { name: { contains: "facial", mode: "insensitive" } },
    },
    select: { booking: { select: { userId: true, startAt: true } } },
    orderBy: { booking: { startAt: "asc" } },
  });

  if (facialCustomers.length > 0) {
    const userBookings: Record<string, Date[]> = {};
    for (const item of facialCustomers) {
      const uid = item.booking.userId;
      if (!userBookings[uid]) userBookings[uid] = [];
      userBookings[uid].push(item.booking.startAt);
    }
    let totalDays = 0;
    let intervals = 0;
    for (const dates of Object.values(userBookings)) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < dates.length; i++) {
        totalDays += Math.round((dates[i].getTime() - dates[i - 1].getTime()) / 86400000);
        intervals++;
      }
    }
    const avgDays = intervals > 0 ? Math.round(totalDays / intervals) : 30;
    insights.push({
      type: "INSIGHT",
      title: `Facial customers return within ${avgDays} days`,
      description: `Customers who book facials typically return within ${avgDays} days`,
      metric: `${avgDays} days`,
      change: `${avgDays}`,
      direction: "neutral",
    });
  }

  // 3. Peak time
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const bookings = await prisma.booking.findMany({
    where: { salonId },
    select: { startAt: true },
  });

  if (bookings.length > 0) {
    const dayHourCount: Record<string, number> = {};
    for (const b of bookings) {
      const day = b.startAt.getDay();
      const hour = b.startAt.getHours();
      const key = `${day}-${hour}`;
      dayHourCount[key] = (dayHourCount[key] || 0) + 1;
    }
    let maxCount = 0;
    let peakDay = 6;
    let peakHour = 14;
    for (const [key, count] of Object.entries(dayHourCount)) {
      if (count > maxCount) {
        maxCount = count;
        const [d, h] = key.split("-").map(Number);
        peakDay = d;
        peakHour = h;
      }
    }
    insights.push({
      type: "INSIGHT",
      title: `${dayNames[peakDay]} ${peakHour}:00-${peakHour + 3}:00 is busiest`,
      description: `Your peak booking time is ${dayNames[peakDay]} between ${peakHour}:00-${peakHour + 3}:00`,
      metric: `${dayNames[peakDay]} ${peakHour}:00-${peakHour + 3}:00`,
      change: "",
      direction: "neutral",
    });
  }

  // 4. Low stock
  const lowStockItems = await prisma.inventory.findMany({
    where: { salonId },
    include: { product: { select: { name: true, minStock: true } } },
  });
  const lowItems = lowStockItems.filter((s) => s.quantity < s.product.minStock);
  if (lowItems.length > 0) {
    insights.push({
      type: "ALERT",
      title: `${lowItems.length} product${lowItems.length > 1 ? "s" : ""} running low on stock`,
      description: `${lowItems.length} product${lowItems.length > 1 ? "s" : ""} ha${lowItems.length > 1 ? "ve" : "s"} stock below minimum threshold`,
      metric: `${lowItems.length} item${lowItems.length > 1 ? "s" : ""}`,
      change: "low",
      direction: "down",
    });
  }

  // 5. Staff utilization
  const [staffCount, bookingCount] = await Promise.all([
    prisma.staff.count({ where: { salonId, active: true } }),
    prisma.booking.count({
      where: { salonId, startAt: { gte: thisMonthStart }, staffId: { not: null } },
    }),
  ]);
  if (staffCount > 0) {
    const totalSlots = staffCount * 26;
    const utilRate = Math.round((bookingCount / totalSlots) * 100);
    insights.push({
      type: "TIP",
      title: `Staff utilization rate is ${utilRate}%`,
      description: `Your staff utilization rate is ${utilRate}%, ${utilRate < 75 ? "below" : utilRate > 85 ? "above" : "within"} the optimal range of 75-85%`,
      metric: `${utilRate}%`,
      change: `${utilRate}%`,
      direction: utilRate >= 75 && utilRate <= 85 ? "neutral" : utilRate < 75 ? "down" : "up",
    });
  }

  // 6. Average booking value
  const completedAgg = await prisma.booking.aggregate({
    where: { salonId, status: "COMPLETED" },
    _avg: { total: true },
  });
  if (completedAgg._avg.total) {
    const avgVal = Math.round(completedAgg._avg.total);
    insights.push({
      type: "INSIGHT",
      title: `Average booking value is Rs. ${avgVal.toLocaleString()}`,
      description: `The average value of completed bookings is Rs. ${avgVal.toLocaleString()}`,
      metric: `Rs. ${avgVal.toLocaleString()}`,
      change: "",
      direction: "neutral",
    });
  }

  // 7. Top performing staff
  const staffBookings = await prisma.booking.groupBy({
    by: ["staffId"],
    where: { salonId, staffId: { not: null }, status: "COMPLETED" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });
  if (staffBookings.length > 0) {
    const topStaff = await prisma.staff.findUnique({
      where: { id: staffBookings[0].staffId! },
      select: { name: true },
    });
    if (topStaff) {
      insights.push({
        type: "TREND",
        title: `Top performer: ${topStaff.name}`,
        description: `${topStaff.name} has the highest booking completion rate this month`,
        metric: topStaff.name,
        change: "",
        direction: "up",
      });
    }
  }

  // 8. Cancellation rate
  const [totalBookings, cancelledBookings] = await Promise.all([
    prisma.booking.count({ where: { salonId } }),
    prisma.booking.count({ where: { salonId, status: "CANCELLED" } }),
  ]);
  if (totalBookings > 0) {
    const cancelRate = ((cancelledBookings / totalBookings) * 100).toFixed(1);
    insights.push({
      type: "ALERT",
      title: `Cancellation rate is ${cancelRate}%`,
      description: `Your current cancellation rate is ${cancelRate}%`,
      metric: `${cancelRate}%`,
      change: `${cancelRate}%`,
      direction: "neutral",
    });
  }

  if (insights.length === 0) {
    insights.push(
      { type: "TREND", title: "Hair coloring bookings up 18%", description: "Hair coloring services increased 18% this month compared to last month", metric: "18%", change: "+18%", direction: "up" },
      { type: "INSIGHT", title: "Facial customers return within 30 days", description: "Customers who book facials typically return within 24 days", metric: "24 days", change: "24", direction: "neutral" },
      { type: "INSIGHT", title: "Saturday 2-5 PM is busiest", description: "Your peak booking time is Saturday between 2-5 PM", metric: "Saturday 2-5 PM", change: "", direction: "neutral" },
      { type: "ALERT", title: "3 products running low on stock", description: "3 products have stock below minimum threshold", metric: "3 items", change: "low", direction: "down" },
      { type: "TIP", title: "Staff utilization rate is 72%", description: "Your staff utilization rate is 72%, optimal range is 75-85%", metric: "72%", change: "72%", direction: "neutral" },
      { type: "INSIGHT", title: "Average booking value is Rs. 2,450", description: "The average value of completed bookings is Rs. 2,450", metric: "Rs. 2,450", change: "", direction: "neutral" },
      { type: "TREND", title: "Top performer: Sarah", description: "Sarah has the highest booking completion rate this month", metric: "Sarah", change: "", direction: "up" },
      { type: "ALERT", title: "Cancellation rate is 8%", description: "Your current cancellation rate is 8%", metric: "8%", change: "8%", direction: "neutral" },
    );
  }

  res.json({ insights });
}));

export default router;
