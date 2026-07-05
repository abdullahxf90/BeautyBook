import { Router } from "express";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";
import { getValidated, validate } from "../middleware/validate";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "SUPER_ADMIN"));

function paginate(page?: string, limit?: string) {
  const p = Math.max(1, parseInt(page || "1") || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit || "20") || 20));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

// ──────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────

router.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const results = await Promise.all([
      prisma.user.count({ where: { status: { not: "DELETED" } } }),
      prisma.user.count({ where: { createdAt: { gte: today }, status: { not: "DELETED" } } }),
      prisma.salon.count(),
      prisma.salon.count({ where: { verified: false } }),
      prisma.salon.count({ where: { verified: true } }),
      prisma.salon.count({ where: { listed: false } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { createdAt: { gte: today } } }),
      prisma.booking.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.booking.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
      prisma.payment.count({ where: { status: "REFUNDED" } }),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.salon.groupBy({ by: ["areaId"], _count: true, orderBy: { _count: { id: "desc" } }, take: 5 }),
      prisma.service.groupBy({ by: ["categoryId"], _count: true, orderBy: { _count: { id: "desc" } }, take: 5 }),
    ]);

    const activeUsers = await (prisma.securityLog.count as any)({
      where: { createdAt: { gte: weekAgo }, action: "LOGIN_SUCCESS" },
      distinct: ["userId"],
    });

    const revenue = (results[12] as any)._sum?.amount ?? 0;
    const avgRating = (results[15] as any)._avg?.rating ?? 0;

    res.json({
      totalUsers: results[0],
      newUsersToday: results[1],
      activeUsers,
      totalSalons: results[2],
      pendingSalons: results[3],
      verifiedSalons: results[4],
      suspendedSalons: results[5],
      totalBookings: results[6],
      todayBookings: results[7],
      weeklyBookings: results[8],
      monthlyBookings: results[9],
      cancelledBookings: results[10],
      completedBookings: results[11],
      revenue,
      refundCount: results[13],
      ticketsOpen: results[14],
      avgRating,
      topCities: results[16],
      topCategories: results[17],
    });
  }),
);

// ──────────────────────────────────────────
// USERS
// ──────────────────────────────────────────

const UserSearchSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().optional().default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

router.get(
  "/users",
  validate(UserSearchSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, q, role, status, sortBy, sortDir } = getValidated<z.infer<typeof UserSearchSchema>>(req);
    const where: Record<string, unknown> = {};
    if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }];
    if (role) where.role = role;
    if (status) where.status = status;
    const [total, users] = await Promise.all([
      prisma.user.count({ where: where as any }),
      prisma.user.findMany({
        where: where as any,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, name: true, email: true, phone: true, role: true, status: true, emailVerified: true, avatarUrl: true, loyaltyPoints: true, createdAt: true, lastLoginAt: true },
      }),
    ]);
    res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

router.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, emailVerified: true, avatarUrl: true, loyaltyPoints: true,       referralCode: true, createdAt: true, lastLoginAt: true, gender: true, dateOfBirth: true },
    });
    if (!user) throw new ApiError(404, "User not found");
    const [loginHistory, devices, sessionCount] = await Promise.all([
      prisma.securityLog.findMany({ where: { userId: user.id, action: { in: ["LOGIN_SUCCESS", "LOGIN_FAILED"] } }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.userDevice.findMany({ where: { userId: user.id } }),
      prisma.refreshToken.count({ where: { userId: user.id } }),
    ]);
    res.json({ user, loginHistory, devices, activeSessions: sessionCount });
  }),
);

const RoleUpdateSchema = z.object({ role: z.enum(["CUSTOMER", "OWNER", "STAFF", "RECEPTIONIST", "MANAGER", "ADMIN"]) });
router.patch(
  "/users/:id/role",
  validate(RoleUpdateSchema),
  asyncHandler(async (req, res) => {
    const { role } = getValidated<z.infer<typeof RoleUpdateSchema>>(req);
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new ApiError(404, "User not found");
    if (target.role === "SUPER_ADMIN") throw new ApiError(403, "Cannot change super admin role");
    const user = await prisma.user.update({
      where: { id: target.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "USER_ROLE_CHANGED", entity: "User", entityId: target.id, details: `Role changed from ${target.role} to ${role}` } }).catch(() => {});
    res.json({ user });
  }),
);

const StatusUpdateSchema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]), reason: z.string().max(500).optional() });
router.patch(
  "/users/:id/status",
  validate(StatusUpdateSchema),
  asyncHandler(async (req, res) => {
    const { status, reason } = getValidated<z.infer<typeof StatusUpdateSchema>>(req);
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new ApiError(404, "User not found");
    if (target.role === "SUPER_ADMIN") throw new ApiError(403, "Cannot modify super admin");
    const user = await prisma.user.update({ where: { id: target.id }, data: { status }, select: { id: true, name: true, email: true, role: true, status: true } });
    if (status !== "ACTIVE") await prisma.refreshToken.deleteMany({ where: { userId: target.id } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: `USER_${status}`, entity: "User", entityId: target.id, details: reason || null } }).catch(() => {});
    res.json({ user });
  }),
);

router.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new ApiError(404, "User not found");
    if (target.role === "SUPER_ADMIN") throw new ApiError(403, "Cannot delete super admin");
    await prisma.user.update({ where: { id: target.id }, data: { status: "DELETED" } });
    await prisma.refreshToken.deleteMany({ where: { userId: target.id } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "USER_DELETED", entity: "User", entityId: target.id } }).catch(() => {});
    res.json({ success: true });
  }),
);

router.post(
  "/users/:id/verify-email",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new ApiError(404, "User not found");
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "USER_EMAIL_VERIFIED", entity: "User", entityId: user.id } }).catch(() => {});
    res.json({ success: true });
  }),
);

router.post(
  "/users/export",
  asyncHandler(async (req, res) => {
    const { q, role, status } = req.body || {};
    const where: Record<string, unknown> = {};
    if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }];
    if (role) where.role = role;
    if (status) where.status = status;
    const users = await prisma.user.findMany({
      where: where as any,
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, emailVerified: true, createdAt: true, lastLoginAt: true },
    });
    res.json({ users });
  }),
);

// ──────────────────────────────────────────
// SALONS
// ──────────────────────────────────────────

router.get(
  "/salons",
  validate(UserSearchSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, q, status, sortBy, sortDir } = getValidated<z.infer<typeof UserSearchSchema>>(req);
    const where: Record<string, unknown> = {};
    if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }];
    if (status === "pending") where.verified = false;
    else if (status === "verified") where.verified = true;
    const [total, salons] = await Promise.all([
      prisma.salon.count({ where: where as any }),
      prisma.salon.findMany({
        where: where as any,
        orderBy: { [sortBy || "createdAt"]: sortDir || "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { area: { include: { city: true } }, owner: { select: { id: true, name: true, email: true } }, _count: { select: { bookings: true, services: true, staff: true } } },
      }),
    ]);
    res.json({ salons, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

router.get(
  "/salons/:id",
  asyncHandler(async (req, res) => {
    const salon = await prisma.salon.findUnique({
      where: { id: req.params.id },
      include: { area: { include: { city: true } }, owner: { select: { id: true, name: true, email: true, phone: true } }, services: true, staff: { include: { user: { select: { name: true, email: true } } } }, _count: { select: { bookings: true, reviews: true } } },
    });
    if (!salon) throw new ApiError(404, "Salon not found");
    const verification = await prisma.businessVerification.findUnique({ where: { salonId: salon.id } });
    res.json({ salon, verification });
  }),
);

router.patch(
  "/salons/:id/verify",
  asyncHandler(async (req, res) => {
    const salon = await prisma.salon.update({ where: { id: req.params.id }, data: { verified: true } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "SALON_VERIFIED", entity: "Salon", entityId: salon.id } }).catch(() => {});
    res.json({ salon });
  }),
);

router.get(
  "/verifications",
  asyncHandler(async (_req, res) => {
    const verifications = await prisma.businessVerification.findMany({
      include: { salon: { select: { id: true, name: true, slug: true, phone: true, email: true, owner: { select: { id: true, name: true, email: true } } } } },
      orderBy: { submittedAt: "desc" },
    });
    res.json({ verifications });
  }),
);

router.post(
  "/verifications/:id/approve",
  asyncHandler(async (req, res) => {
    const v = await prisma.businessVerification.update({ where: { id: req.params.id }, data: { status: "APPROVED", reviewedAt: new Date(), reviewedBy: req.user!.id } });
    await prisma.salon.update({ where: { id: v.salonId }, data: { verified: true } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "VERIFICATION_APPROVED", entity: "BusinessVerification", entityId: v.id } }).catch(() => {});
    res.json({ verification: v });
  }),
);

router.post(
  "/verifications/:id/reject",
  validate(z.object({ reason: z.string().min(1).max(1000) })),
  asyncHandler(async (req, res) => {
    const { reason } = getValidated<{ reason: string }>(req);
    const v = await prisma.businessVerification.update({ where: { id: req.params.id }, data: { status: "REJECTED", rejectionReason: reason, reviewedAt: new Date(), reviewedBy: req.user!.id } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "VERIFICATION_REJECTED", entity: "BusinessVerification", entityId: v.id } }).catch(() => {});
    res.json({ verification: v });
  }),
);

// ──────────────────────────────────────────
// BOOKINGS
// ──────────────────────────────────────────

router.get(
  "/bookings",
  validate(z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.string().optional(),
    q: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }), "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, status, q, from, to } = getValidated<any>(req);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) where.OR = [{ code: { contains: q, mode: "insensitive" } }];
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to);
      where.createdAt = createdAt;
    }
    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where: where as any }),
      prisma.booking.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          salon: { select: { id: true, name: true, slug: true } },
          items: { include: { service: { select: { id: true, name: true, price: true } } } },
          payment: { select: { id: true, amount: true, status: true, method: true } },
        },
      }),
    ]);
    res.json({ bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

router.get(
  "/bookings/:id",
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        salon: { select: { id: true, name: true, slug: true, phone: true } },
        items: { include: { service: true } },
        payment: true,
        review: true,
      },
    });
    if (!booking) throw new ApiError(404, "Booking not found");
    res.json({ booking });
  }),
);

router.post(
  "/bookings/:id/cancel",
  validate(z.object({ reason: z.string().max(500).optional() })),
  asyncHandler(async (req, res) => {
    const { reason } = getValidated<{ reason?: string }>(req);
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { payment: true } });
    if (!booking) throw new ApiError(404, "Booking not found");
    if (booking.status === "CANCELLED") throw new ApiError(400, "Booking already cancelled");
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED", notes: reason || "Cancelled by admin" } });
    if (booking.payment && booking.payment.status === "PAID") {
      await prisma.payment.update({ where: { id: booking.payment.id }, data: { status: "REFUNDED" } });
    }
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "BOOKING_CANCELLED", entity: "Booking", entityId: booking.id, details: reason } }).catch(() => {});
    res.json({ success: true });
  }),
);

// ──────────────────────────────────────────
// PAYMENTS
// ──────────────────────────────────────────

router.get(
  "/payments",
  validate(z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.string().optional(),
    method: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }), "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, status, method, from, to } = getValidated<any>(req);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (method) where.method = method;
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to);
      where.createdAt = createdAt;
    }
    const [total, payments] = await Promise.all([
      prisma.payment.count({ where: where as any }),
      prisma.payment.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { booking: { select: { code: true, salon: { select: { name: true } } } } },
      }),
    ]);
    const aggregations = await prisma.payment.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: "PAID" },
    });
    res.json({ payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, totalRevenue: aggregations._sum.amount ?? 0 });
  }),
);

router.post(
  "/payments/:id/refund",
  validate(z.object({ reason: z.string().max(500).optional() })),
  asyncHandler(async (req, res) => {
    const { reason } = getValidated<{ reason?: string }>(req);
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) throw new ApiError(404, "Payment not found");
    if (payment.status === "REFUNDED") throw new ApiError(400, "Already refunded");
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "PAYMENT_REFUNDED", entity: "Payment", entityId: payment.id, details: reason } }).catch(() => {});
    res.json({ success: true });
  }),
);

// ──────────────────────────────────────────
// COMMISSIONS
// ──────────────────────────────────────────

router.get(
  "/commissions",
  asyncHandler(async (_req, res) => {
    const rules = await (prisma as any).commissionRule.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ commissions: rules });
  }),
);

router.post(
  "/commissions",
  validate(z.object({
    name: z.string().min(1),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    rate: z.number().min(0),
    categoryId: z.string().optional(),
    salonId: z.string().optional(),
    minBookingValue: z.number().int().optional(),
    maxBookingValue: z.number().int().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
  })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const rule = await (prisma as any).commissionRule.create({
      data: { ...data, startAt: data.startAt ? new Date(data.startAt) : undefined, endAt: data.endAt ? new Date(data.endAt) : undefined, createdBy: req.user!.id },
    });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "COMMISSION_CREATED", entity: "CommissionRule", entityId: rule.id } }).catch(() => {});
    res.status(201).json({ commission: rule });
  }),
);

router.put(
  "/commissions/:id",
  validate(z.object({
    name: z.string().min(1),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    rate: z.number().min(0),
    active: z.boolean().optional(),
  })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const rule = await (prisma as any).commissionRule.update({ where: { id: req.params.id }, data });
    res.json({ commission: rule });
  }),
);

router.delete(
  "/commissions/:id",
  asyncHandler(async (req, res) => {
    await (prisma as any).commissionRule.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "COMMISSION_DELETED", entity: "CommissionRule", entityId: req.params.id } }).catch(() => {});
    res.json({ success: true });
  }),
);

// ──────────────────────────────────────────
// SUBSCRIPTIONS
// ──────────────────────────────────────────

router.get(
  "/subscriptions",
  asyncHandler(async (_req, res) => {
    const [plans, activeSubs, totalRevenue] = await Promise.all([
      prisma.membership.findMany({ orderBy: { price: "asc" } }),
      prisma.userMembership.count({ where: { status: "ACTIVE" } }),
      prisma.membershipPayment.aggregate({ _sum: { amount: true } }),
    ]);
    const subscriptions = await prisma.subscription.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    res.json({ plans, activeSubscriptions: activeSubs, totalRevenue: totalRevenue._sum.amount ?? 0, subscriptions });
  }),
);

router.post(
  "/subscriptions/plans",
  validate(z.object({ name: z.string().min(1), slug: z.string().min(1), description: z.string(), price: z.number().int().positive(), durationDays: z.number().int().positive(), perks: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const plan = await prisma.membership.create({ data: { ...data, perks: data.perks || "[]" } });
    res.status(201).json({ plan });
  }),
);

router.put(
  "/subscriptions/plans/:id",
  validate(z.object({ name: z.string().min(1), description: z.string(), price: z.number().int().positive(), durationDays: z.number().int().positive(), active: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const plan = await prisma.membership.update({ where: { id: req.params.id }, data });
    res.json({ plan });
  }),
);

// ──────────────────────────────────────────
// CMS
// ──────────────────────────────────────────

router.get(
  "/cms/pages",
  asyncHandler(async (_req, res) => {
    const pages = await prisma.page.findMany({ orderBy: { sortOrder: "asc" } });
    res.json({ pages });
  }),
);

router.post(
  "/cms/pages",
  validate(z.object({ slug: z.string().min(1), title: z.string().min(1), content: z.string(), metaTitle: z.string().optional(), metaDesc: z.string().optional(), published: z.boolean().optional(), sortOrder: z.number().int().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const page = await prisma.page.create({ data });
    res.status(201).json({ page });
  }),
);

router.put(
  "/cms/pages/:id",
  validate(z.object({ title: z.string().min(1), content: z.string(), metaTitle: z.string().optional(), metaDesc: z.string().optional(), published: z.boolean().optional(), sortOrder: z.number().int().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const page = await prisma.page.update({ where: { id: req.params.id }, data });
    res.json({ page });
  }),
);

router.delete(
  "/cms/pages/:id",
  asyncHandler(async (req, res) => {
    await prisma.page.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
);

router.get(
  "/cms/blogs",
  asyncHandler(async (req, res) => {
    const { page: p, limit: l } = paginate(req.query.page as string, req.query.limit as string);
    const where: Record<string, unknown> = {};
    if (req.query.q) where.OR = [{ title: { contains: req.query.q as string, mode: "insensitive" } }];
    if (req.query.category) where.category = req.query.category;
    const [total, blogs] = await Promise.all([
      prisma.blogPost.count({ where: where as any }),
      prisma.blogPost.findMany({ where: where as any, orderBy: { createdAt: "desc" }, skip: p, take: l }),
    ]);
    res.json({ blogs, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
  }),
);

router.post(
  "/cms/blogs",
  validate(z.object({ slug: z.string().min(1), title: z.string().min(1), excerpt: z.string(), content: z.string(), category: z.string().optional(), tags: z.string().optional(), coverUrl: z.string().optional(), authorName: z.string().optional(), published: z.boolean().optional(), featured: z.boolean().optional(), readTimeMin: z.number().int().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const blog = await prisma.blogPost.create({ data });
    res.status(201).json({ blog });
  }),
);

router.put(
  "/cms/blogs/:id",
  validate(z.object({ title: z.string().min(1), excerpt: z.string(), content: z.string(), category: z.string().optional(), tags: z.string().optional(), coverUrl: z.string().optional(), published: z.boolean().optional(), featured: z.boolean().optional(), readTimeMin: z.number().int().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const blog = await prisma.blogPost.update({ where: { id: req.params.id }, data });
    res.json({ blog });
  }),
);

router.delete(
  "/cms/blogs/:id",
  asyncHandler(async (req, res) => {
    await prisma.blogPost.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
);

router.get(
  "/cms/faqs",
  asyncHandler(async (_req, res) => {
    const faqs = await prisma.faq.findMany({ orderBy: { sortOrder: "asc" } });
    res.json({ faqs });
  }),
);

router.post(
  "/cms/faqs",
  validate(z.object({ question: z.string().min(1), answer: z.string().min(1), category: z.string().optional(), sortOrder: z.number().int().optional(), published: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const faq = await prisma.faq.create({ data });
    res.status(201).json({ faq });
  }),
);

router.put(
  "/cms/faqs/:id",
  validate(z.object({ question: z.string().min(1), answer: z.string().min(1), category: z.string().optional(), sortOrder: z.number().int().optional(), published: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const faq = await prisma.faq.update({ where: { id: req.params.id }, data });
    res.json({ faq });
  }),
);

router.delete(
  "/cms/faqs/:id",
  asyncHandler(async (req, res) => {
    await prisma.faq.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
);

router.get(
  "/cms/banners",
  asyncHandler(async (_req, res) => {
    const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
    res.json({ banners });
  }),
);

router.post(
  "/cms/banners",
  validate(z.object({ title: z.string().optional(), subtitle: z.string().optional(), imageUrl: z.string(), link: z.string().optional(), position: z.string().optional(), sortOrder: z.number().int().optional(), active: z.boolean().optional(), startAt: z.string().datetime().optional(), endAt: z.string().datetime().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const banner = await prisma.banner.create({
      data: { ...data, startAt: data.startAt ? new Date(data.startAt) : undefined, endAt: data.endAt ? new Date(data.endAt) : undefined },
    });
    res.status(201).json({ banner });
  }),
);

router.put(
  "/cms/banners/:id",
  validate(z.object({ title: z.string().optional(), subtitle: z.string().optional(), imageUrl: z.string().optional(), link: z.string().optional(), sortOrder: z.number().int().optional(), active: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const banner = await prisma.banner.update({ where: { id: req.params.id }, data });
    res.json({ banner });
  }),
);

router.delete(
  "/cms/banners/:id",
  asyncHandler(async (req, res) => {
    await prisma.banner.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
);

// ──────────────────────────────────────────
// ADVERTISEMENTS
// ──────────────────────────────────────────

router.get(
  "/ads",
  asyncHandler(async (_req, res) => {
    const ads = await (prisma as any).advertisement.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { impressions: true, clicks: true } } },
    });
    res.json({ advertisements: ads });
  }),
);

router.post(
  "/ads",
  validate(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    imageUrl: z.string(),
    linkUrl: z.string().optional(),
    placement: z.enum(["HOME_BANNER", "SIDEBAR", "POPUP", "FEATURED_SALON", "SPONSORED_LISTING", "SEARCH_RESULT", "CATEGORY_PAGE"]),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    budget: z.number().int().optional(),
    maxImpressions: z.number().int().optional(),
    maxClicks: z.number().int().optional(),
    salonId: z.string().optional(),
    sortOrder: z.number().int().optional(),
  })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const ad = await (prisma as any).advertisement.create({
      data: { ...data, startAt: data.startAt ? new Date(data.startAt) : undefined, endAt: data.endAt ? new Date(data.endAt) : undefined },
    });
    res.status(201).json({ advertisement: ad });
  }),
);

router.put(
  "/ads/:id",
  validate(z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    linkUrl: z.string().optional(),
    status: z.enum(["ACTIVE", "PAUSED", "EXPIRED", "CANCELLED"]).optional(),
    budget: z.number().int().optional(),
    sortOrder: z.number().int().optional(),
  })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const ad = await (prisma as any).advertisement.update({ where: { id: req.params.id }, data });
    res.json({ advertisement: ad });
  }),
);

router.delete(
  "/ads/:id",
  asyncHandler(async (req, res) => {
    await (prisma as any).advertisement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
);

router.get(
  "/ads/:id/stats",
  asyncHandler(async (req, res) => {
    const [impressions, clicks] = await Promise.all([
      (prisma as any).adImpression.count({ where: { advertisementId: req.params.id } }),
      (prisma as any).adClick.count({ where: { advertisementId: req.params.id } }),
    ]);
    const dailyImpressions = await (prisma as any).adImpression.groupBy({
      by: ["servedAt"],
      where: { advertisementId: req.params.id },
      _count: true,
    });
    res.json({ impressions, clicks, dailyImpressions });
  }),
);

// ──────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────

router.post(
  "/notifications/send",
  validate(z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    channel: z.enum(["IN_APP", "PUSH", "EMAIL", "SMS"]),
    targetType: z.enum(["ALL", "USERS", "SALONS", "CUSTOMERS", "CITY", "ROLE"]).optional(),
    targetValue: z.string().optional(),
    imageUrl: z.string().optional(),
    linkUrl: z.string().optional(),
  })),
  asyncHandler(async (req, res) => {
    const { title, body, channel, targetType, targetValue, imageUrl, linkUrl } = getValidated<any>(req);
    let targets: Array<{ id: string }> = [];
    if (targetType === "ALL" || !targetType) {
      targets = await prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
    } else if (targetType === "CITY") {
      targets = await prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
    } else if (targetType === "ROLE") {
      targets = await prisma.user.findMany({ where: { role: targetValue as any, status: "ACTIVE" }, select: { id: true } });
    }
    if (channel === "IN_APP" && targets.length > 0) {
      await prisma.notification.createMany({
        data: targets.map((t) => ({ userId: t.id, title, body, imageUrl: imageUrl || null, linkUrl: linkUrl || null })),
      });
    }
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "NOTIFICATION_SENT", entity: "Notification", details: `${channel} - ${title} - ${targets.length} recipients` } }).catch(() => {});
    res.json({ success: true, sentCount: targets.length });
  }),
);

router.get(
  "/notifications/logs",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query.page as string, req.query.limit as string);
    const [total, logs] = await Promise.all([
      prisma.notificationLog.count(),
      prisma.notificationLog.findMany({ orderBy: { createdAt: "desc" }, skip, take }),
    ]);
    res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

// ──────────────────────────────────────────
// SUPPORT
// ──────────────────────────────────────────

router.get(
  "/support/tickets",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query.page as string, req.query.limit as string);
    const where: Record<string, unknown> = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where: where as any }),
      prisma.supportTicket.findMany({
        where: where as any,
        orderBy: { updatedAt: "desc" },
        skip,
        take,
        include: { user: { select: { id: true, name: true, email: true } }, _count: { select: { messages: true } } },
      }),
    ]);
    res.json({ tickets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

router.put(
  "/support/tickets/:id",
  validate(z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]).optional(), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(), assignedTo: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const ticket = await prisma.supportTicket.update({ where: { id: req.params.id }, data });
    res.json({ ticket });
  }),
);

router.post(
  "/support/tickets/:id/reply",
  validate(z.object({ content: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const { content } = getValidated<{ content: string }>(req);
    const message = await prisma.ticketMessage.create({
      data: { ticketId: req.params.id, userId: req.user!.id, content, isStaff: true },
    });
    await prisma.supportTicket.update({ where: { id: req.params.id }, data: { status: "IN_PROGRESS" } });
    res.status(201).json({ message });
  }),
);

// ──────────────────────────────────────────
// ANALYTICS
// ──────────────────────────────────────────

router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [dailyStats, topServices, topSalons, topCities, couponUsage] = await Promise.all([
      prisma.dailyStatistic.findMany({ where: { date: { gte: startDate } }, orderBy: { date: "asc" } }),
      prisma.bookingItem.groupBy({ by: ["serviceId"], _count: { id: true }, _sum: { price: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
      prisma.salon.findMany({ orderBy: { bookings: { _count: "desc" } }, take: 10, select: { id: true, name: true, slug: true, _count: { select: { bookings: true } } } }),
      prisma.salon.groupBy({ by: ["areaId"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
      prisma.couponUsage.groupBy({ by: ["couponId"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
    ]);

    res.json({ dailyStats, topServices, topSalons, topCities, couponUsage });
  }),
);

router.get(
  "/analytics/revenue",
  asyncHandler(async (req, res) => {
    const months = parseInt(req.query.months as string) || 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const data = await prisma.monthlyStatistic.findMany({ where: { month: { gte: startDate } }, orderBy: { month: "asc" } });
    res.json({ revenueData: data });
  }),
);

router.get(
  "/analytics/export/:type",
  asyncHandler(async (req, res) => {
    const type = req.params.type;
    if (type === "users") {
      const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, status: true, createdAt: true } });
      return res.json({ data: users });
    }
    if (type === "bookings") {
      const data = await prisma.booking.findMany({ include: { user: { select: { name: true } }, salon: { select: { name: true } } } });
      return res.json({ data });
    }
    if (type === "revenue") {
      const data = await prisma.payment.findMany({ where: { status: "PAID" } });
      return res.json({ data });
    }
    throw new ApiError(400, "Invalid export type");
  }),
);

// ──────────────────────────────────────────
// FRAUD
// ──────────────────────────────────────────

router.get(
  "/fraud/rules",
  asyncHandler(async (_req, res) => {
    const rules = await (prisma as any).fraudRule.findMany({ orderBy: { priority: "desc" } });
    res.json({ rules });
  }),
);

router.post(
  "/fraud/rules",
  validate(z.object({ name: z.string().min(1), description: z.string().optional(), type: z.string().min(1), condition: z.string(), action: z.string(), priority: z.number().int().optional(), active: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const rule = await (prisma as any).fraudRule.create({ data });
    res.status(201).json({ rule });
  }),
);

router.put(
  "/fraud/rules/:id",
  validate(z.object({ active: z.boolean().optional(), priority: z.number().int().optional(), condition: z.string().optional(), action: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const rule = await (prisma as any).fraudRule.update({ where: { id: req.params.id }, data });
    res.json({ rule });
  }),
);

router.delete(
  "/fraud/rules/:id",
  asyncHandler(async (req, res) => {
    await (prisma as any).fraudRule.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
);

router.get(
  "/fraud/reports",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query.page as string, req.query.limit as string);
    const where: Record<string, unknown> = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.severity) where.severity = req.query.severity;
    const [total, reports] = await Promise.all([
      (prisma as any).fraudReport.count({ where: where as any }),
      (prisma as any).fraudReport.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { rule: { select: { id: true, name: true } } },
      }),
    ]);
    res.json({ reports, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

router.patch(
  "/fraud/reports/:id",
  validate(z.object({ status: z.enum(["PENDING_INVESTIGATION", "CONFIRMED", "FALSE_POSITIVE", "DISMISSED"]), resolution: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const { status, resolution } = getValidated<any>(req);
    const report = await (prisma as any).fraudReport.update({
      where: { id: req.params.id },
      data: { status, reviewedBy: req.user!.id, reviewedAt: new Date(), resolution },
    });
    res.json({ report });
  }),
);

// ──────────────────────────────────────────
// AUDIT LOGS
// ──────────────────────────────────────────

router.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query.page as string, req.query.limit as string);
    const where: Record<string, unknown> = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.entity) where.entity = req.query.entity;
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where: where as any }),
      prisma.auditLog.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);
    res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

// ──────────────────────────────────────────
// ROLES & PERMISSIONS
// ──────────────────────────────────────────

router.get(
  "/permissions",
  asyncHandler(async (_req, res) => {
    const permissions = await prisma.permission.findMany({ orderBy: { group: "asc" } });
    res.json({ permissions });
  }),
);

router.post(
  "/permissions",
  validate(z.object({ name: z.string().min(1), slug: z.string().min(1), description: z.string().optional(), group: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const permission = await prisma.permission.create({ data });
    res.status(201).json({ permission });
  }),
);

router.delete(
  "/permissions/:id",
  asyncHandler(async (req, res) => {
    await prisma.permission.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
);

router.get(
  "/roles",
  asyncHandler(async (_req, res) => {
    const roles = await prisma.userRole.findMany({ include: { user: { select: { id: true, name: true } } } });
    const permissions = await prisma.rolePermission.findMany({ include: { permission: true } });
    res.json({ roles, rolePermissions: permissions });
  }),
);

router.put(
  "/roles/:role",
  validate(z.object({ permissionIds: z.array(z.string()) })),
  asyncHandler(async (req, res) => {
    const { permissionIds } = getValidated<{ permissionIds: string[] }>(req);
    const role = req.params.role as any;
    await prisma.rolePermission.deleteMany({ where: { role } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ role, permissionId })) });
    }
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "ROLE_PERMISSIONS_UPDATED", entity: "Role", entityId: role } }).catch(() => {});
    res.json({ success: true });
  }),
);

// ──────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────

router.get(
  "/settings",
  asyncHandler(async (req, res) => {
    const group = req.query.group as string;
    const where: Record<string, unknown> = {};
    if (group) where.group = group;
    const settings = await prisma.appSetting.findMany({ where: where as any, orderBy: { key: "asc" } });
    res.json({ settings });
  }),
);

router.put(
  "/settings/:key",
  validate(z.object({ value: z.string(), type: z.string().optional(), group: z.string().optional(), description: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const setting = await prisma.appSetting.upsert({
      where: { key: req.params.key },
      update: { value: data.value, type: data.type, group: data.group, description: data.description },
      create: { key: req.params.key, value: data.value, type: data.type || "STRING", group: data.group || "general", description: data.description },
    });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "SETTING_UPDATED", entity: "AppSetting", entityId: req.params.key, details: `${req.params.key}=${data.value}` } }).catch(() => {});
    res.json({ setting });
  }),
);

// ──────────────────────────────────────────
// FEATURE FLAGS
// ──────────────────────────────────────────

router.get(
  "/feature-flags",
  asyncHandler(async (_req, res) => {
    const flags = await prisma.featureFlag.findMany({ orderBy: { name: "asc" } });
    res.json({ featureFlags: flags });
  }),
);

router.put(
  "/feature-flags/:key",
  validate(z.object({ enabled: z.boolean(), name: z.string().optional(), description: z.string().optional(), rules: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const data = getValidated<any>(req);
    const flag = await prisma.featureFlag.upsert({
      where: { key: req.params.key },
      update: { enabled: data.enabled, name: data.name, description: data.description, rules: data.rules },
      create: { key: req.params.key, name: data.name || req.params.key, enabled: data.enabled, description: data.description, rules: data.rules },
    });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "FEATURE_FLAG_UPDATED", entity: "FeatureFlag", entityId: req.params.key, details: `${req.params.key}=${data.enabled}` } }).catch(() => {});
    res.json({ featureFlag: flag });
  }),
);

// ──────────────────────────────────────────
// API KEYS
// ──────────────────────────────────────────

router.get(
  "/api-keys",
  asyncHandler(async (_req, res) => {
    const keys = await (prisma as any).apiKey.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, prefix: true, active: true, lastUsedAt: true, createdAt: true, userId: true } });
    res.json({ apiKeys: keys });
  }),
);

router.post(
  "/api-keys",
  validate(z.object({ name: z.string().min(1), permissions: z.array(z.string()).optional() })),
  asyncHandler(async (req, res) => {
    const { name, permissions } = getValidated<{ name: string; permissions?: string[] }>(req);
    const crypto = require("crypto");
    const raw = crypto.randomBytes(32).toString("hex");
    const prefix = raw.substring(0, 8);
    const key = await (prisma as any).apiKey.create({ data: { name, key: raw, prefix, userId: req.user!.id, permissions: JSON.stringify(permissions || []) } });
    res.status(201).json({ apiKey: { id: key.id, name: key.name, prefix: key.prefix, key: raw, active: key.active, createdAt: key.createdAt } });
  }),
);

router.delete(
  "/api-keys/:id",
  asyncHandler(async (req, res) => {
    await (prisma as any).apiKey.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
);

router.get(
  "/api-logs",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query.page as string, req.query.limit as string);
    const [total, logs] = await Promise.all([
      (prisma as any).apiLog.count(),
      (prisma as any).apiLog.findMany({ orderBy: { createdAt: "desc" }, skip, take, include: { apiKey: { select: { name: true } } } }),
    ]);
    res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

// ──────────────────────────────────────────
// BACKUPS
// ──────────────────────────────────────────

router.get(
  "/backups",
  asyncHandler(async (_req, res) => {
    const backups = await (prisma as any).backupHistory.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    res.json({ backups });
  }),
);

router.post(
  "/backups",
  validate(z.object({ type: z.enum(["MANUAL", "SCHEDULED"]), scope: z.enum(["FULL", "DATABASE_ONLY", "STORAGE_ONLY"]) })),
  asyncHandler(async (req, res) => {
    const { type, scope } = getValidated<{ type: string; scope: string }>(req);
    const backup = await (prisma as any).backupHistory.create({ data: { type, scope, triggeredBy: req.user!.id } });
    res.status(201).json({ backup, message: "Backup initiated" });
  }),
);

// ──────────────────────────────────────────
// SECURITY
// ──────────────────────────────────────────

router.get(
  "/security",
  asyncHandler(async (_req, res) => {
    const recent = new Date();
    recent.setHours(recent.getHours() - 24);
    const [failedLogins24h, blockedIps, activeSessions, securityAlerts] = await Promise.all([
      prisma.securityLog.count({ where: { action: "LOGIN_FAILED", createdAt: { gte: recent } } }),
      prisma.securityLog.findMany({ where: { action: "IP_BLOCKED" }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.refreshToken.count(),
      prisma.securityLog.findMany({ where: { createdAt: { gte: recent }, action: { not: "LOGIN_SUCCESS" } }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    res.json({ failedLogins24h, blockedIps: blockedIps.length, activeSessions, securityAlerts });
  }),
);

router.get(
  "/security/logs",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query.page as string, req.query.limit as string);
    const [total, logs] = await Promise.all([
      prisma.securityLog.count(),
      prisma.securityLog.findMany({ orderBy: { createdAt: "desc" }, skip, take, include: { user: { select: { id: true, name: true, email: true } } } }),
    ]);
    res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

// ──────────────────────────────────────────
// SYSTEM HEALTH
// ──────────────────────────────────────────

router.get(
  "/system",
  asyncHandler(async (_req, res) => {
    const [errorLogs24h, apiRequests24h, storageItems] = await Promise.all([
      prisma.systemLog.count({ where: { level: "ERROR", createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      prisma.systemLog.count({ where: { module: "API", createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      prisma.media.count(),
    ]);
    res.json({
      status: "healthy",
      uptime: process.uptime(),
      database: { status: "connected" },
      storage: { totalItems: storageItems },
      api24h: apiRequests24h,
      errors24h: errorLogs24h,
      memory: process.memoryUsage(),
    });
  }),
);

export default router;
