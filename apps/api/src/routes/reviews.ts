import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();

const createSchema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(2000),
});

async function refreshSalonRating(salonId: string) {
  const agg = await prisma.review.aggregate({
    where: { salonId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.salon.update({
    where: { id: salonId },
    data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
  });
}

// Verified reviews only: the booking must belong to the user and be COMPLETED.
router.post("/", requireAuth, validate(createSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof createSchema>>(req);
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: { review: true },
  });
  if (!booking || booking.userId !== req.user!.id) throw new ApiError(404, "Booking not found");
  if (booking.status !== "COMPLETED") throw new ApiError(403, "You can only review completed appointments");
  if (booking.review) throw new ApiError(409, "You have already reviewed this appointment");

  const review = await prisma.review.create({
    data: {
      userId: req.user!.id,
      salonId: booking.salonId,
      bookingId: booking.id,
      rating: data.rating,
      text: data.text,
    },
  });
  await refreshSalonRating(booking.salonId);
  res.status(201).json({ review });
}));

const editSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  text: z.string().min(10).max(2000).optional(),
});

router.patch("/:id", requireAuth, validate(editSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof editSchema>>(req);
  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review || review.userId !== req.user!.id) throw new ApiError(404, "Review not found");
  const updated = await prisma.review.update({ where: { id: review.id }, data });
  await refreshSalonRating(review.salonId);
  res.json({ review: updated });
}));

router.post("/:id/helpful", asyncHandler(async (req, res) => {
  const review = await prisma.review.update({
    where: { id: req.params.id },
    data: { helpful: { increment: 1 } },
  }).catch(() => null);
  if (!review) throw new ApiError(404, "Review not found");
  res.json({ review });
}));

const replySchema = z.object({ reply: z.string().min(2).max(1000) });

router.post("/:id/reply", requireAuth, requireRole("OWNER", "ADMIN"), validate(replySchema), asyncHandler(async (req, res) => {
  const { reply } = getValidated<z.infer<typeof replySchema>>(req);
  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    include: { salon: { select: { ownerId: true } } },
  });
  if (!review) throw new ApiError(404, "Review not found");
  if (req.user!.role !== "ADMIN" && review.salon.ownerId !== req.user!.id) {
    throw new ApiError(403, "You can only reply to reviews of your own salon");
  }
  const updated = await prisma.review.update({ where: { id: review.id }, data: { ownerReply: reply } });
  res.json({ review: updated });
}));

export default router;
