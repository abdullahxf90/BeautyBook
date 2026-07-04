import { Router } from "express";
import { prisma } from "@beautybook/database";
import { asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.post("/trigger/reminders", requireRole("OWNER", "ADMIN"), asyncHandler(async (req, res) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      startAt: { gte: tomorrowStart, lt: tomorrowEnd },
    },
    include: { user: { select: { id: true } } },
  });

  const notifications = bookings.map((b) =>
    prisma.notification.create({
      data: {
        userId: b.userId,
        title: "Appointment Reminder",
        body: `Your booking for ${b.code} is tomorrow. We look forward to seeing you!`,
        type: "BOOKING_REMINDER",
        channel: "IN_APP",
      },
    })
  );

  const reminders = bookings.map((b) =>
    prisma.bookingReminder.create({
      data: {
        bookingId: b.id,
        channel: "IN_APP",
        sentAt: new Date(),
        type: "REMINDER",
      },
    })
  );

  await Promise.all([...notifications, ...reminders]);

  if (bookings.length > 0) {
    await prisma.systemLog.create({
      data: {
        level: "INFO",
        module: "AUTOMATION",
        message: `Sent ${bookings.length} appointment reminders for tomorrow`,
        metadata: JSON.stringify({ count: bookings.length, type: "reminders" }),
      },
    });
  }

  res.json({ sent: bookings.length });
}));

router.post("/trigger/birthday-rewards", requireRole("OWNER", "ADMIN"), asyncHandler(async (req, res) => {
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();

  const allBirthdays = await prisma.crmBirthday.findMany({
    include: { crmCustomer: { select: { userId: true, salonId: true } } },
  });

  const matching = allBirthdays.filter((b) => {
    const d = new Date(b.date);
    return d.getDate() === todayDay && d.getMonth() === todayMonth;
  });

  let sent = 0;
  for (const birthday of matching) {
    const user = await prisma.user.findUnique({
      where: { id: birthday.crmCustomer.userId },
      select: { id: true, loyaltyPoints: true },
    });
    if (!user) continue;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { loyaltyPoints: user.loyaltyPoints + 100 },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          userId: user.id,
          points: 100,
          reason: "BIRTHDAY",
          type: "EARN",
        },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          title: "Happy Birthday!",
          body: "Happy Birthday! We've added 100 loyalty points to your account as a special gift.",
          type: "BIRTHDAY_REWARD",
          channel: "IN_APP",
        },
      }),
    ]);
    sent++;
  }

  if (sent > 0) {
    await prisma.systemLog.create({
      data: {
        level: "INFO",
        module: "AUTOMATION",
        message: `Sent ${sent} birthday rewards`,
        metadata: JSON.stringify({ count: sent, type: "birthday_rewards" }),
      },
    });
  }

  res.json({ sent });
}));

router.post("/trigger/review-requests", requireRole("OWNER", "ADMIN"), asyncHandler(async (req, res) => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const completedBookings = await prisma.booking.findMany({
    where: {
      status: "COMPLETED",
      endAt: { lte: twoHoursAgo },
      review: null,
    },
    select: { id: true, userId: true, salonId: true },
  });

  const notifications = completedBookings.map((b) =>
    prisma.notification.create({
      data: {
        userId: b.userId,
        title: "How was your experience?",
        body: "We'd love to hear about your recent visit. Please leave a review!",
        type: "REVIEW_REQUEST",
        channel: "IN_APP",
      },
    })
  );

  await Promise.all(notifications);

  if (completedBookings.length > 0) {
    await prisma.systemLog.create({
      data: {
        level: "INFO",
        module: "AUTOMATION",
        message: `Sent ${completedBookings.length} review requests`,
        metadata: JSON.stringify({ count: completedBookings.length, type: "review_requests" }),
      },
    });
  }

  res.json({ sent: completedBookings.length });
}));

router.post("/trigger/low-stock-alerts", requireRole("OWNER", "ADMIN"), asyncHandler(async (req, res) => {
  const { salonId } = req.query as { salonId: string };
  if (!salonId) {
    return res.status(400).json({ error: "salonId is required" });
  }

  const inventory = await prisma.inventory.findMany({
    where: { salonId },
    include: { product: { select: { name: true, minStock: true } } },
  });

  const lowStockItems = inventory.filter((s) => s.quantity < s.product.minStock);

  let sent = 0;
  if (lowStockItems.length > 0) {
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { ownerId: true },
    });

    if (salon?.ownerId) {
      const names = lowStockItems.map((s) => s.product.name).join(", ");
      await prisma.notification.create({
        data: {
          userId: salon.ownerId,
          title: "Low Stock Alert",
          body: `The following products are running low: ${names}`,
          type: "LOW_STOCK_ALERT",
          channel: "IN_APP",
        },
      });
      sent = lowStockItems.length;
    }

    await prisma.systemLog.create({
      data: {
        level: "WARN",
        module: "AUTOMATION",
        message: `Low stock alert: ${lowStockItems.length} product(s) below minimum threshold`,
        metadata: JSON.stringify({
          count: lowStockItems.length,
          items: lowStockItems.map((s) => ({ productId: s.productId, quantity: s.quantity, minStock: s.product.minStock })),
          type: "low_stock_alerts",
        }),
      },
    });
  }

  res.json({ sent, items: lowStockItems.length });
}));

router.get("/jobs", asyncHandler(async (req, res) => {
  const jobs = await prisma.systemLog.findMany({
    where: { module: "AUTOMATION" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json({ jobs });
}));

export default router;
