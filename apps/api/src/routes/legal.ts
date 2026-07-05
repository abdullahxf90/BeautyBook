import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

// Public: published legal pages (terms, privacy, refund-policy) from CMS
router.get("/policies", asyncHandler(async (_req, res) => {
  const pages = await prisma.page.findMany({
    where: { published: true, slug: { in: ["terms", "privacy", "refund-policy", "cookie-policy"] } },
    select: { slug: true, title: true, content: true, updatedAt: true },
  });
  res.json({ policies: pages });
}));

router.use(requireAuth);

// ── Consent management ──────────────────────────

router.get("/consents", asyncHandler(async (req, res) => {
  let consent = await prisma.userConsent.findUnique({ where: { userId: req.user!.id } });
  if (!consent) consent = await prisma.userConsent.create({ data: { userId: req.user!.id } });
  res.json({ consent });
}));

const consentSchema = z.object({
  marketing: z.boolean().optional(),
  analytics: z.boolean().optional(),
  personalization: z.boolean().optional(),
  acceptTerms: z.boolean().optional(),
  acceptPrivacy: z.boolean().optional(),
});

router.put("/consents", validate(consentSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof consentSchema>>(req);
  const now = new Date();
  const update = {
    marketing: data.marketing,
    analytics: data.analytics,
    personalization: data.personalization,
    termsAcceptedAt: data.acceptTerms ? now : undefined,
    privacyAcceptedAt: data.acceptPrivacy ? now : undefined,
  };
  const consent = await prisma.userConsent.upsert({
    where: { userId: req.user!.id },
    update,
    create: {
      userId: req.user!.id,
      marketing: data.marketing ?? false,
      analytics: data.analytics ?? true,
      personalization: data.personalization ?? true,
      termsAcceptedAt: data.acceptTerms ? now : null,
      privacyAcceptedAt: data.acceptPrivacy ? now : null,
    },
  });
  await prisma.auditLog.create({
    data: { userId: req.user!.id, action: "CONSENT_UPDATED", entity: "UserConsent", entityId: consent.id, details: JSON.stringify(data) },
  });
  res.json({ consent });
}));

// ── Data export (GDPR-style right of access) ────

router.get("/data-export", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const [user, bookings, reviews, favorites, addresses, walletTxns, loyaltyTxns, notifications, tickets, searches, consent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, phone: true, name: true, role: true, gender: true, dateOfBirth: true,
        avatarUrl: true, loyaltyPoints: true, loyaltyTier: true, referralCode: true, createdAt: true,
      },
    }),
    prisma.booking.findMany({ where: { userId }, include: { items: true, salon: { select: { name: true } } } }),
    prisma.review.findMany({ where: { userId } }),
    prisma.favorite.findMany({ where: { userId }, include: { salon: { select: { name: true } } } }),
    prisma.address.findMany({ where: { userId } }),
    prisma.walletTransaction.findMany({ where: { userId } }),
    prisma.loyaltyTransaction.findMany({ where: { userId } }),
    prisma.notification.findMany({ where: { userId } }),
    prisma.supportTicket.findMany({ where: { userId }, include: { messages: true } }),
    prisma.searchHistory.findMany({ where: { userId } }),
    prisma.userConsent.findUnique({ where: { userId } }),
  ]);
  await prisma.auditLog.create({
    data: { userId, action: "DATA_EXPORTED", entity: "User", entityId: userId },
  });
  res.setHeader("Content-Disposition", 'attachment; filename="beautybook-data-export.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    profile: user,
    consent,
    bookings,
    reviews,
    favorites,
    addresses,
    walletTransactions: walletTxns,
    loyaltyTransactions: loyaltyTxns,
    notifications,
    supportTickets: tickets,
    searchHistory: searches,
  });
}));

// ── Account deletion workflow (right to delete) ─

const deleteRequestSchema = z.object({ reason: z.string().max(1000).optional() });

router.post("/delete-request", validate(deleteRequestSchema), asyncHandler(async (req, res) => {
  const { reason } = getValidated<z.infer<typeof deleteRequestSchema>>(req);
  const pending = await prisma.accountDeletionRequest.findFirst({
    where: { userId: req.user!.id, status: { in: ["PENDING", "PROCESSING"] } },
  });
  if (pending) throw new ApiError(409, "A deletion request is already pending");
  const request = await prisma.accountDeletionRequest.create({
    data: { userId: req.user!.id, reason: reason ?? null },
  });
  await prisma.auditLog.create({
    data: { userId: req.user!.id, action: "DELETION_REQUESTED", entity: "AccountDeletionRequest", entityId: request.id },
  });
  res.status(201).json({ request });
}));

router.get("/delete-request", asyncHandler(async (req, res) => {
  const request = await prisma.accountDeletionRequest.findFirst({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ request });
}));

router.delete("/delete-request", asyncHandler(async (req, res) => {
  const { count } = await prisma.accountDeletionRequest.updateMany({
    where: { userId: req.user!.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  if (!count) throw new ApiError(404, "No pending deletion request");
  res.json({ ok: true });
}));

// ── Admin: process deletion requests ────────────

router.get("/delete-requests", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const status = (req.query.status as string) || "PENDING";
  const requests = await prisma.accountDeletionRequest.findMany({
    where: { status },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  res.json({ requests });
}));

router.post("/delete-requests/:id/process", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const request = await prisma.accountDeletionRequest.findUnique({ where: { id: req.params.id } });
  if (!request) throw new ApiError(404, "Request not found");
  if (request.status !== "PENDING") throw new ApiError(400, `Request is ${request.status}`);
  const anonymizedEmail = `deleted-${request.userId}@deleted.beautybook.pk`;
  await prisma.$transaction([
    // Soft delete + anonymize PII; bookings/payments are retained for financial records
    prisma.user.update({
      where: { id: request.userId },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
        email: anonymizedEmail,
        phone: null,
        name: "Deleted User",
        avatarUrl: null,
        googleId: null,
        facebookId: null,
        dateOfBirth: null,
      },
    }),
    prisma.refreshToken.deleteMany({ where: { userId: request.userId } }),
    prisma.session.deleteMany({ where: { userId: request.userId } }),
    prisma.address.deleteMany({ where: { userId: request.userId } }),
    prisma.searchHistory.deleteMany({ where: { userId: request.userId } }),
    prisma.accountDeletionRequest.update({
      where: { id: request.id },
      data: { status: "COMPLETED", processedBy: req.user!.id, processedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: { userId: req.user!.id, action: "DELETION_PROCESSED", entity: "User", entityId: request.userId },
    }),
  ]);
  res.json({ ok: true });
}));

export default router;
