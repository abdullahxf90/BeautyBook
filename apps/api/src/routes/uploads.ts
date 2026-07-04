import { Router } from "express";
import { nanoid } from "nanoid";
import { prisma } from "@beautybook/database";
import { authenticate } from "../middleware/auth";
import { uploadSingle, uploadMultiple, uploadDocument } from "../middleware/upload";
import { uploadFile, deleteFile, pathFromUrl, BUCKETS } from "../lib/storage";
import { ApiError, asyncHandler } from "../utils/http";

const router = Router();

// ─── Helper ──────────────────────────────────────────────────────────────────
function ext(mimetype: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
  };
  return map[mimetype] ?? "bin";
}

// ─── User Avatar ─────────────────────────────────────────────────────────────
// PUT /api/uploads/avatar
router.put(
  "/avatar",
  authenticate,
  uploadSingle("avatar"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No file provided");

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { avatarUrl: true } });

    // Delete old avatar if it came from our storage
    if (user?.avatarUrl?.includes("supabase.co")) {
      await deleteFile(BUCKETS.AVATARS, pathFromUrl(user.avatarUrl));
    }

    const path = `${req.user!.id}.${ext(req.file.mimetype)}`;
    const url = await uploadFile(BUCKETS.AVATARS, path, req.file.buffer, req.file.mimetype);

    await prisma.user.update({ where: { id: req.user!.id }, data: { avatarUrl: url } });
    res.json({ url });
  }),
);

// DELETE /api/uploads/avatar
router.delete(
  "/avatar",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { avatarUrl: true } });
    if (user?.avatarUrl?.includes("supabase.co")) {
      await deleteFile(BUCKETS.AVATARS, pathFromUrl(user.avatarUrl));
    }
    await prisma.user.update({ where: { id: req.user!.id }, data: { avatarUrl: null } });
    res.json({ ok: true });
  }),
);

// ─── Salon Images ─────────────────────────────────────────────────────────────
// POST /api/uploads/salon/:salonId/images  (up to 10 images)
router.post(
  "/salon/:salonId/images",
  authenticate,
  uploadMultiple("images", 10),
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) throw new ApiError(400, "No files provided");

    const salon = await prisma.salon.findUnique({ where: { id: req.params.salonId }, select: { ownerId: true } });
    if (!salon) throw new ApiError(404, "Salon not found");
    if (salon.ownerId !== req.user!.id && req.user!.role !== "ADMIN") throw new ApiError(403, "Forbidden");

    const urls: string[] = [];
    for (const file of files) {
      const path = `${req.params.salonId}/${nanoid()}.${ext(file.mimetype)}`;
      const url = await uploadFile(BUCKETS.SALON_IMAGES, path, file.buffer, file.mimetype);
      await prisma.salonImage.create({ data: { salonId: req.params.salonId, url, alt: salon ? "" : "" } });
      urls.push(url);
    }
    res.status(201).json({ urls });
  }),
);

// DELETE /api/uploads/salon/:salonId/images/:imageId
router.delete(
  "/salon/:salonId/images/:imageId",
  authenticate,
  asyncHandler(async (req, res) => {
    const salon = await prisma.salon.findUnique({ where: { id: req.params.salonId }, select: { ownerId: true } });
    if (!salon) throw new ApiError(404, "Salon not found");
    if (salon.ownerId !== req.user!.id && req.user!.role !== "ADMIN") throw new ApiError(403, "Forbidden");

    const img = await prisma.salonImage.findUnique({ where: { id: req.params.imageId } });
    if (!img) throw new ApiError(404, "Image not found");
    if (img.url.includes("supabase.co")) {
      await deleteFile(BUCKETS.SALON_IMAGES, pathFromUrl(img.url));
    }
    await prisma.salonImage.delete({ where: { id: req.params.imageId } });
    res.json({ ok: true });
  }),
);

// ─── Salon Logo ───────────────────────────────────────────────────────────────
// PUT /api/uploads/salon/:salonId/logo
router.put(
  "/salon/:salonId/logo",
  authenticate,
  uploadSingle("logo"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No file provided");
    const salon = await prisma.salon.findUnique({ where: { id: req.params.salonId }, select: { ownerId: true } });
    if (!salon) throw new ApiError(404, "Salon not found");
    if (salon.ownerId !== req.user!.id && req.user!.role !== "ADMIN") throw new ApiError(403, "Forbidden");

    const path = `${req.params.salonId}/logo.${ext(req.file.mimetype)}`;
    const url = await uploadFile(BUCKETS.SALON_LOGOS, path, req.file.buffer, req.file.mimetype);
    res.json({ url });
  }),
);

// ─── Employee Photos ──────────────────────────────────────────────────────────
// PUT /api/uploads/employee/:employeeId/photo
router.put(
  "/employee/:employeeId/photo",
  authenticate,
  uploadSingle("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No file provided");
    const path = `${req.params.employeeId}.${ext(req.file.mimetype)}`;
    const url = await uploadFile(BUCKETS.EMPLOYEE_PHOTOS, path, req.file.buffer, req.file.mimetype);
    res.json({ url });
  }),
);

// ─── Review Media ─────────────────────────────────────────────────────────────
// POST /api/uploads/review/:reviewId/media  (up to 5 images)
router.post(
  "/review/:reviewId/media",
  authenticate,
  uploadMultiple("media", 5),
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) throw new ApiError(400, "No files provided");

    const review = await prisma.review.findUnique({ where: { id: req.params.reviewId }, select: { userId: true } });
    if (!review) throw new ApiError(404, "Review not found");
    if (review.userId !== req.user!.id) throw new ApiError(403, "Forbidden");

    const urls: string[] = [];
    for (const file of files) {
      const path = `${req.params.reviewId}/${nanoid()}.${ext(file.mimetype)}`;
      const url = await uploadFile(BUCKETS.REVIEW_MEDIA, path, file.buffer, file.mimetype);
      urls.push(url);
    }
    res.status(201).json({ urls });
  }),
);

// ─── Coupon Banners ───────────────────────────────────────────────────────────
// PUT /api/uploads/coupon/:couponId/banner
router.put(
  "/coupon/:couponId/banner",
  authenticate,
  uploadSingle("banner"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No file provided");
    if (req.user!.role !== "ADMIN" && req.user!.role !== "OWNER") throw new ApiError(403, "Forbidden");
    const path = `${req.params.couponId}.${ext(req.file.mimetype)}`;
    const url = await uploadFile(BUCKETS.COUPON_BANNERS, path, req.file.buffer, req.file.mimetype);
    res.json({ url });
  }),
);

// ─── Category Icons ───────────────────────────────────────────────────────────
// PUT /api/uploads/category/:categoryId/icon  (admin only)
router.put(
  "/category/:categoryId/icon",
  authenticate,
  uploadSingle("icon"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No file provided");
    if (req.user!.role !== "ADMIN") throw new ApiError(403, "Admin only");
    const path = `${req.params.categoryId}.${ext(req.file.mimetype)}`;
    const url = await uploadFile(BUCKETS.CATEGORY_ICONS, path, req.file.buffer, req.file.mimetype);
    res.json({ url });
  }),
);

// ─── Documents (private) ──────────────────────────────────────────────────────
// POST /api/uploads/documents  (salon verification docs etc.)
router.post(
  "/documents",
  authenticate,
  uploadDocument("document"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No file provided");
    const path = `${req.user!.id}/${nanoid()}.${ext(req.file.mimetype)}`;
    const url = await uploadFile(BUCKETS.DOCUMENTS, path, req.file.buffer, req.file.mimetype);
    res.status(201).json({ url });
  }),
);

export default router;
