import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

router.use(requireAuth);

const bookingInclude = {
  salon: { select: { name: true, slug: true, address: true, phone: true, area: { include: { city: true } } } },
  employee: { select: { name: true, title: true } },
  items: true,
  payment: true,
  review: { select: { id: true } },
} as const;

const createSchema = z.object({
  salonSlug: z.string(),
  serviceIds: z.array(z.string()).min(1),
  employeeId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  paymentMethod: z.enum(["CASH", "CARD", "JAZZCASH", "EASYPAISA"]).default("CASH"),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

router.post("/", validate(createSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof createSchema>>(req);

  const salon = await prisma.salon.findUnique({
    where: { slug: data.salonSlug },
    include: { workingHours: true },
  });
  if (!salon) throw new ApiError(404, "Salon not found");

  const services = await prisma.service.findMany({
    where: { id: { in: data.serviceIds }, salonId: salon.id, active: true },
  });
  if (services.length !== data.serviceIds.length) {
    throw new ApiError(400, "One or more services are not available at this salon");
  }
  if (data.employeeId) {
    const emp = await prisma.employee.findFirst({ where: { id: data.employeeId, salonId: salon.id, active: true } });
    if (!emp) throw new ApiError(400, "Selected specialist is not available at this salon");
  }

  const durationMin = services.reduce((s, x) => s + x.durationMin, 0);
  const subtotal = services.reduce((s, x) => s + x.price, 0);

  const [hh, mm] = data.time.split(":").map(Number);
  const startAt = new Date(`${data.date}T00:00:00`);
  startAt.setHours(hh, mm, 0, 0);
  if (startAt <= new Date()) throw new ApiError(400, "Cannot book a time in the past");

  const hours = salon.workingHours.find((h) => h.dayOfWeek === startAt.getDay());
  const startMin = hh * 60 + mm;
  if (!hours || hours.closed || startMin < hours.openMin || startMin + durationMin > hours.closeMin) {
    throw new ApiError(400, "The salon is closed at the selected time");
  }

  const endAt = new Date(startAt.getTime() + durationMin * 60000);
  const clash = await prisma.booking.findFirst({
    where: {
      salonId: salon.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      ...(data.employeeId ? { employeeId: data.employeeId } : {}),
      startAt: { lt: endAt, gte: new Date(startAt.getTime() - 8 * 3600 * 1000) },
    },
    orderBy: { startAt: "asc" },
  });
  if (clash) {
    const clashEnd = new Date(clash.startAt.getTime() + clash.durationMin * 60000);
    if (startAt < clashEnd && endAt > clash.startAt) {
      throw new ApiError(409, "That time slot was just taken — please pick another");
    }
  }

  let discount = 0;
  let couponId: string | undefined;
  if (data.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: data.couponCode.toUpperCase() } });
    if (!coupon || !coupon.active) throw new ApiError(400, "Invalid coupon code");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new ApiError(400, "This coupon has expired");
    if (coupon.maxUses && coupon.uses >= coupon.maxUses) throw new ApiError(400, "This coupon has been fully redeemed");
    if (coupon.salonId && coupon.salonId !== salon.id) throw new ApiError(400, "This coupon is not valid at this salon");
    if (subtotal < coupon.minTotal) throw new ApiError(400, `This coupon requires a minimum spend of Rs ${coupon.minTotal}`);
    discount = coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
    discount = Math.min(discount, subtotal);
    couponId = coupon.id;
    await prisma.coupon.update({ where: { id: coupon.id }, data: { uses: { increment: 1 } } });
  }

  const total = subtotal - discount;
  const code = `BB-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;

  const booking = await prisma.booking.create({
    data: {
      code,
      userId: req.user!.id,
      salonId: salon.id,
      employeeId: data.employeeId,
      startAt,
      durationMin,
      subtotal,
      discount,
      total,
      paymentMethod: data.paymentMethod,
      couponId,
      notes: data.notes,
      status: salon.instantBooking ? "CONFIRMED" : "PENDING",
      items: {
        create: services.map((s) => ({ serviceId: s.id, name: s.name, price: s.price, durationMin: s.durationMin })),
      },
      payment: {
        create: { method: data.paymentMethod, amount: total, status: data.paymentMethod === "CASH" ? "PENDING" : "PENDING" },
      },
    },
    include: bookingInclude,
  });

  await prisma.notification.create({
    data: {
      userId: req.user!.id,
      title: "Booking confirmed",
      body: `${salon.name} on ${startAt.toDateString()} at ${data.time}. Code ${code}.`,
    },
  });

  res.status(201).json({ booking });
}));

router.get("/mine", asyncHandler(async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    orderBy: { startAt: "desc" },
    include: bookingInclude,
  });
  res.json({ bookings });
}));

router.post("/:id/cancel", asyncHandler(async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking || booking.userId !== req.user!.id) throw new ApiError(404, "Booking not found");
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new ApiError(400, "Only upcoming bookings can be cancelled");
  }
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CANCELLED",
      payment: { update: { status: booking.paymentMethod === "CASH" ? "FAILED" : "REFUNDED" } },
    },
    include: bookingInclude,
  });
  await prisma.bookingTracking.create({
    data: { bookingId: booking.id, fromStatus: booking.status, toStatus: "CANCELLED", changedBy: req.user!.id, reason: "Cancelled by customer" },
  });
  await prisma.notification.create({
    data: { userId: req.user!.id, title: "Booking cancelled", body: `Booking ${booking.code} has been cancelled.` },
  });
  res.json({ booking: updated });
}));

const rescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

router.post("/:id/reschedule", validate(rescheduleSchema), asyncHandler(async (req, res) => {
  const { date, time } = getValidated<z.infer<typeof rescheduleSchema>>(req);
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking || booking.userId !== req.user!.id) throw new ApiError(404, "Booking not found");
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new ApiError(400, "Only upcoming bookings can be rescheduled");
  }
  const [hh, mm] = time.split(":").map(Number);
  const startAt = new Date(`${date}T00:00:00`);
  startAt.setHours(hh, mm, 0, 0);
  if (startAt <= new Date()) throw new ApiError(400, "Cannot reschedule to a time in the past");
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { startAt },
    include: bookingInclude,
  });
  await prisma.bookingTracking.create({
    data: { bookingId: booking.id, fromStatus: booking.status, toStatus: booking.status, changedBy: req.user!.id, reason: `Rescheduled to ${date} ${time}` },
  });
  res.json({ booking: updated });
}));

// Owner/admin marks a booking completed; awards loyalty points.
router.post("/:id/complete", requireRole("OWNER", "ADMIN"), asyncHandler(async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
    throw new ApiError(400, "Booking cannot be completed from its current status");
  }
  const points = Math.floor(booking.total / 100);
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "COMPLETED", payment: { update: { status: "PAID" } } },
    include: bookingInclude,
  });
  await prisma.bookingTracking.create({
    data: { bookingId: booking.id, fromStatus: booking.status, toStatus: "COMPLETED", changedBy: req.user!.id, reason: "Marked completed" },
  });
  await prisma.user.update({ where: { id: booking.userId }, data: { loyaltyPoints: { increment: points } } });
  await prisma.loyaltyTransaction.create({
    data: { userId: booking.userId, points, reason: "Completed booking", bookingId: booking.id },
  });
  await prisma.notification.create({
    data: { userId: booking.userId, title: "Thanks for visiting!", body: `You earned ${points} loyalty points. Leave a review to help others glow.` },
  });
  res.json({ booking: updated });
}));

// ── Booking lifecycle extensions ──

// Check-in
router.put("/:id/check-in", asyncHandler(async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "CONFIRMED") throw new ApiError(400, "Booking must be CONFIRMED to check in");
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "ARRIVED", checkInAt: new Date() },
  });
  await prisma.bookingTracking.create({
    data: { bookingId: booking.id, fromStatus: "CONFIRMED", toStatus: "ARRIVED", changedBy: req.user!.id },
  });
  res.json({ booking: updated });
}));

// Check-out
router.put("/:id/check-out", asyncHandler(async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "IN_PROGRESS" && booking.status !== "ARRIVED") throw new ApiError(400, "Booking must be in progress to check out");
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "COMPLETED", checkOutAt: new Date(), endAt: new Date() },
  });
  await prisma.bookingTracking.create({
    data: { bookingId: booking.id, fromStatus: booking.status, toStatus: "COMPLETED", changedBy: req.user!.id },
  });
  res.json({ booking: updated });
}));

// Start booking (in progress)
router.put("/:id/start", asyncHandler(async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "ARRIVED") throw new ApiError(400, "Customer must be checked in first");
  const updated = await prisma.booking.update({
    where: { id: booking.id }, data: { status: "IN_PROGRESS" },
  });
  await prisma.bookingTracking.create({
    data: { bookingId: booking.id, fromStatus: "ARRIVED", toStatus: "IN_PROGRESS", changedBy: req.user!.id },
  });
  res.json({ booking: updated });
}));

// Tracking history
router.get("/:id/tracking", asyncHandler(async (req, res) => {
  const tracking = await prisma.bookingTracking.findMany({
    where: { bookingId: req.params.id }, orderBy: { createdAt: "asc" },
  });
  res.json({ tracking });
}));

// ── Waitlist ──

router.get("/waitlist", asyncHandler(async (req, res) => {
  const { salonId } = req.query;
  if (!salonId) throw new ApiError(400, "salonId required");
  const entries = await prisma.bookingWaitlist.findMany({
    where: { salonId: salonId as string },
    orderBy: { createdAt: "desc" },
    include: { service: { select: { name: true, price: true } }, staff: { select: { name: true } } },
  });
  res.json({ entries });
}));

const waitlistSchema = z.object({
  salonId: z.string(), name: z.string().min(2), phone: z.string().min(10),
  serviceId: z.string().optional(), staffId: z.string().optional(),
  preferredDate: z.string().optional(), notes: z.string().optional(),
});

router.post("/waitlist", validate(waitlistSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof waitlistSchema>>(req);
  const entry = await prisma.bookingWaitlist.create({
    data: {
      salonId: data.salonId, userId: req.user?.id, name: data.name, phone: data.phone,
      serviceId: data.serviceId, staffId: data.staffId,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : undefined,
      notes: data.notes,
    },
  });
  res.status(201).json({ entry });
}));

router.put("/waitlist/:id/convert", asyncHandler(async (req, res) => {
  const entry = await prisma.bookingWaitlist.update({
    where: { id: req.params.id }, data: { converted: true, notified: true },
  });
  res.json({ entry });
}));

router.delete("/waitlist/:id", asyncHandler(async (req, res) => {
  await prisma.bookingWaitlist.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ── Reschedule history ──

router.get("/:id/reschedules", asyncHandler(async (req, res) => {
  const reschedules = await prisma.bookingReschedule.findMany({
    where: { bookingId: req.params.id }, orderBy: { createdAt: "desc" },
  });
  res.json({ reschedules });
}));

// ── Slot Locking ──

const lockSlotSchema = z.object({
  salonId: z.string(),
  staffId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMin: z.number().int().min(0).max(1439),
  durationMin: z.number().int().min(5).max(1440),
  sessionId: z.string(),
});

router.post("/slots/lock", validate(lockSlotSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof lockSlotSchema>>(req);

  const dayStart = new Date(`${data.date}T00:00:00`);
  const dayEnd = new Date(`${data.date}T23:59:59`);
  const slotStart = new Date(dayStart.getTime() + data.startMin * 60000);
  const slotEndMin = data.startMin + data.durationMin;

  const [existingLocks, overlapping] = await Promise.all([
    prisma.slotLock.findMany({
      where: {
        salonId: data.salonId,
        date: { gte: dayStart, lte: dayEnd },
        expiresAt: { gt: new Date() },
      },
    }),
    prisma.booking.findMany({
      where: {
        salonId: data.salonId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startAt: { gte: dayStart, lte: dayEnd },
      },
    }),
  ]);

  const relevantLocks = existingLocks.filter((l) =>
    !data.staffId || l.staffId === null || l.staffId === data.staffId,
  );

  for (const lock of relevantLocks) {
    if (lock.startMin < slotEndMin && data.startMin < lock.startMin + lock.durationMin) {
      throw new ApiError(409, "This slot is already locked by another session");
    }
  }

  const relevantBookings = overlapping.filter((b) => {
    if (!data.staffId) return true;
    const bStaffId = b.staffId ?? b.employeeId ?? null;
    return bStaffId === null || bStaffId === data.staffId;
  });

  for (const b of relevantBookings) {
    const bStartMin = b.startAt.getHours() * 60 + b.startAt.getMinutes();
    if (bStartMin < slotEndMin && data.startMin < bStartMin + b.durationMin) {
      throw new ApiError(409, "This time slot is already booked");
    }
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const lock = await prisma.slotLock.create({
    data: {
      salonId: data.salonId,
      staffId: data.staffId,
      date: slotStart,
      startMin: data.startMin,
      durationMin: data.durationMin,
      sessionId: data.sessionId,
      userId: req.user!.id,
      expiresAt,
    },
  });

  res.status(201).json({ lockId: lock.id, expiresAt });
}));

const renewLockSchema = z.object({
  lockId: z.string(),
});

router.post("/slots/renew", validate(renewLockSchema), asyncHandler(async (req, res) => {
  const { lockId } = getValidated<z.infer<typeof renewLockSchema>>(req);

  const lock = await prisma.slotLock.findUnique({ where: { id: lockId } });
  if (!lock) throw new ApiError(404, "Lock not found");
  if (lock.expiresAt < new Date()) throw new ApiError(400, "Lock has already expired");

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.slotLock.update({ where: { id: lockId }, data: { expiresAt } });

  res.json({ expiresAt });
}));

const releaseLockSchema = z.object({
  lockId: z.string(),
});

router.post("/slots/release", validate(releaseLockSchema), asyncHandler(async (req, res) => {
  const { lockId } = getValidated<z.infer<typeof releaseLockSchema>>(req);
  await prisma.slotLock.delete({ where: { id: lockId } });
  res.json({ ok: true });
}));

const availableSlotsSchema = z.object({
  salonId: z.string(),
  staffId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceIds: z.string().optional(),
  durationMin: z.coerce.number().int().min(5).optional(),
});

router.get("/slots/available", validate(availableSlotsSchema, "query"), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof availableSlotsSchema>>(req);

  let totalDuration = data.durationMin;
  if (data.serviceIds) {
    const ids = data.serviceIds.split(",").filter(Boolean);
    const services = await prisma.service.findMany({
      where: { id: { in: ids }, salonId: data.salonId, active: true },
    });
    totalDuration = services.reduce((s, x) => s + x.durationMin, 0);
  }
  if (!totalDuration) throw new ApiError(400, "Either serviceIds or durationMin is required");

  const dateObj = new Date(`${data.date}T00:00:00`);
  const dayOfWeek = dateObj.getDay();
  const dayStart = dateObj;
  const dayEnd = new Date(`${data.date}T23:59:59`);

  const workingHour = await prisma.workingHour.findUnique({
    where: { salonId_dayOfWeek: { salonId: data.salonId, dayOfWeek } },
  });

  if (!workingHour || workingHour.closed) {
    return res.json({ slots: [], date: data.date, staffId: data.staffId, totalDuration });
  }

  const [allStaff, bookings, locks] = await Promise.all([
    prisma.staff.findMany({ where: { salonId: data.salonId, active: true }, select: { id: true } }),
    prisma.booking.findMany({
      where: {
        salonId: data.salonId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startAt: { gte: dayStart, lte: dayEnd },
      },
      select: {
        startAt: true, durationMin: true, employeeId: true, staffId: true,
        staffAssignments: { select: { staffId: true } },
      },
    }),
    prisma.slotLock.findMany({
      where: {
        salonId: data.salonId,
        date: { gte: dayStart, lte: dayEnd },
        expiresAt: { gt: new Date() },
      },
      select: { startMin: true, durationMin: true, staffId: true, userId: true, expiresAt: true },
    }),
  ]);

  const userLocks = locks.filter((l) => l.userId === req.user!.id);
  const lockMap = new Map<string, Date>();
  for (const l of userLocks) {
    const key = `${l.startMin}-${l.durationMin}-${l.staffId ?? ""}`;
    lockMap.set(key, l.expiresAt);
  }

  const interval = 15;
  const slots: Array<{
    startMin: number; startTime: string; endTime: string;
    available: boolean; status: string; staffAvailable: number; lockExpiresAt?: string;
  }> = [];

  for (let m = workingHour.openMin; m + totalDuration <= workingHour.closeMin; m += interval) {
    const endM = m + totalDuration;

    const overlappingBookings = bookings.filter((b) => {
      const bStartMin = b.startAt.getHours() * 60 + b.startAt.getMinutes();
      return bStartMin < endM && m < bStartMin + b.durationMin;
    });

    const overlappingLocks = locks.filter((l) => l.startMin < endM && m < l.startMin + l.durationMin);

    let staffAvailable: number;
    let available: boolean;

    if (data.staffId) {
      const busy = overlappingBookings.some((b) => {
        if (b.employeeId === data.staffId || b.staffId === data.staffId) return true;
        if (b.staffAssignments.some((a) => a.staffId === data.staffId)) return true;
        return false;
      }) || overlappingLocks.some((l) => l.staffId === data.staffId);
      staffAvailable = busy ? 0 : 1;
      available = staffAvailable > 0;
    } else {
      const busyStaffIds = new Set<string>();
      for (const b of overlappingBookings) {
        const bookingStaffIds = new Set<string>();
        if (b.employeeId) bookingStaffIds.add(b.employeeId);
        if (b.staffId) bookingStaffIds.add(b.staffId);
        for (const a of b.staffAssignments) bookingStaffIds.add(a.staffId);
        if (bookingStaffIds.size === 0) {
          busyStaffIds.clear();
          busyStaffIds.add("*ALL*");
          break;
        }
        for (const id of bookingStaffIds) busyStaffIds.add(id);
      }
      for (const l of overlappingLocks) {
        if (l.staffId) busyStaffIds.add(l.staffId);
        else { busyStaffIds.clear(); busyStaffIds.add("*ALL*"); break; }
      }
      const allLocked = busyStaffIds.has("*ALL*");
      staffAvailable = allLocked ? 0 : allStaff.length - busyStaffIds.size;
      available = !allLocked && staffAvailable > 0;
    }

    const isPeak = (m >= 600 && m < 720) || (m >= 960 && m < 1140);
    let status: string;
    if (!available) status = "FULL";
    else if (staffAvailable === 1 && !data.staffId) status = "ONLY_ONE";
    else if (isPeak) status = "POPULAR";
    else status = "AVAILABLE";

    const lockKey = `${m}-${totalDuration}-${data.staffId ?? ""}`;
    const lockExpiresAt = lockMap.get(lockKey);

    const hh = Math.floor(m / 60).toString().padStart(2, "0");
    const mm = (m % 60).toString().padStart(2, "0");
    const endHh = Math.floor(endM / 60).toString().padStart(2, "0");
    const endMm = (endM % 60).toString().padStart(2, "0");

    slots.push({
      startMin: m,
      startTime: `${hh}:${mm}`,
      endTime: `${endHh}:${endMm}`,
      available,
      status,
      staffAvailable: Math.max(0, staffAvailable),
      ...(lockExpiresAt ? { lockExpiresAt: lockExpiresAt.toISOString() } : {}),
    });
  }

  res.json({ slots, date: data.date, staffId: data.staffId, totalDuration });
}));

// ── Multi-Staff Booking Support ──

const assignStaffSchema = z.object({
  staffIds: z.array(z.string()).min(1),
});

router.put("/:id/staff", validate(assignStaffSchema), asyncHandler(async (req, res) => {
  const { staffIds } = getValidated<z.infer<typeof assignStaffSchema>>(req);

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw new ApiError(404, "Booking not found");

  await prisma.bookingStaff.deleteMany({ where: { bookingId: booking.id } });

  await prisma.bookingStaff.createMany({
    data: staffIds.map((staffId, i) => ({
      bookingId: booking.id,
      staffId,
      role: i === 0 ? "PRIMARY" : "ASSISTANT",
    })),
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { employeeId: staffIds[0] },
  });

  const updated = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: {
      ...bookingInclude,
      staffAssignments: { include: { staff: { select: { name: true, title: true } } } },
    },
  });

  res.json({ booking: updated });
}));

export default router;
