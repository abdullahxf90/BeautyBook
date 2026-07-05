import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";
import { config } from "../config";

const router = Router();

const stripe = config.stripeSecretKey
  ? (() => { try { return require("stripe")(config.stripeSecretKey); } catch { return null; } })()
  : null;

router.post("/create-intent", requireAuth, validate(z.object({
  bookingId: z.string(),
  amount: z.number().int().min(1),
  currency: z.string().default("usd"),
})), asyncHandler(async (req, res) => {
  if (!stripe) throw new ApiError(503, "Stripe is not configured");
  const { bookingId, amount, currency } = getValidated<{ bookingId: string; amount: number; currency: string }>(req);
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new ApiError(404, "Booking not found");
  const payment = await prisma.payment.create({
    data: {
      bookingId, method: "STRIPE", status: "PENDING", amount,
      provider: "stripe",
    },
  });
  const intent = await stripe.paymentIntents.create({
    amount, currency: currency.toLowerCase(),
    metadata: { bookingId, paymentId: payment.id, userId: req.user!.id },
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: intent.id } });
  await prisma.paymentAttempt.create({
    data: { paymentId: payment.id, method: "STRIPE", status: "ATTEMPTED", providerRef: intent.id },
  });
  res.json({ clientSecret: intent.client_secret, paymentId: payment.id });
}));

interface JazzCashInit {
  pp_Version: string; pp_TxnType: string; pp_Language: string;
  pp_MerchantID: string; pp_Password: string; pp_TxnRefNo: string;
  pp_Amount: string; pp_TxnCurrency: string; pp_TxnDateTime: string;
  pp_BillReference: string; pp_Description: string;
  pp_ReturnURL: string; ppmpf_1: string; ppmpf_2: string; ppmpf_3: string; ppmpf_4: string; ppmpf_5: string;
}

router.post("/jazzcash/initiate", requireAuth, validate(z.object({
  bookingId: z.string(),
  amount: z.number().int().min(1),
})), asyncHandler(async (req, res) => {
  const { bookingId, amount } = getValidated<{ bookingId: string; amount: number }>(req);
  if (!config.jazzcashMerchantId) throw new ApiError(503, "JazzCash is not configured");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new ApiError(404, "Booking not found");
  const txnRefNo = `JC${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const payment = await prisma.payment.create({
    data: { bookingId, method: "JAZZCASH", status: "PENDING", amount, provider: "jazzcash", providerRef: txnRefNo },
  });
  const txnDate = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const payload: JazzCashInit = {
    pp_Version: "2.0", pp_TxnType: "MWALLET", pp_Language: "EN",
    pp_MerchantID: config.jazzcashMerchantId,
    pp_Password: config.jazzcashPassword!,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: String(amount * 100),
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: txnDate,
    pp_BillReference: payment.id,
    pp_Description: `Booking ${booking.code}`,
    pp_ReturnURL: `${config.apiBaseUrl}/api/payments/jazzcash/complete`,
    ppmpf_1: req.user!.id,
    ppmpf_2: bookingId,
    ppmpf_3: "", ppmpf_4: "", ppmpf_5: "",
  };
  res.json({ paymentId: payment.id, txnRefNo, payload });
}));

router.post("/jazzcash/complete", asyncHandler(async (req, res) => {
  const { pp_TxnRefNo, pp_ResponseCode, pp_ResponseMessage, pp_Amount, pp_BillReference } = req.body as Record<string, string>;
  if (pp_ResponseCode === "000") {
    await prisma.$transaction([
      prisma.payment.update({ where: { id: pp_BillReference }, data: { status: "PAID", providerRef: pp_TxnRefNo } }),
      prisma.paymentAttempt.create({
        data: { paymentId: pp_BillReference, method: "JAZZCASH", status: "SUCCESS", providerRef: pp_TxnRefNo },
      }),
    ]);
    res.json({ ok: true, status: "PAID" });
  } else {
    await prisma.paymentAttempt.create({
      data: { paymentId: pp_BillReference, method: "JAZZCASH", status: "FAILED", providerRef: pp_TxnRefNo, error: pp_ResponseMessage },
    });
    res.json({ ok: false, status: "FAILED", message: pp_ResponseMessage });
  }
}));

router.post("/easypaisa/initiate", requireAuth, validate(z.object({
  bookingId: z.string(),
  amount: z.number().int().min(1),
})), asyncHandler(async (req, res) => {
  const { bookingId, amount } = getValidated<{ bookingId: string; amount: number }>(req);
  if (!config.easypaisaMerchantId) throw new ApiError(503, "EasyPaisa is not configured");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new ApiError(404, "Booking not found");
  const txnRefNo = `EP${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const payment = await prisma.payment.create({
    data: { bookingId, method: "EASYPAISA", status: "PENDING", amount, provider: "easypaisa", providerRef: txnRefNo },
  });
  res.json({
    paymentId: payment.id, txnRefNo,
    redirectUrl: `${config.easypaisaEndpoint || "https://easypaisa.com"}/pay?amount=${amount}&ref=${txnRefNo}&merchant=${config.easypaisaMerchantId}&return=${config.apiBaseUrl}/api/payments/easypaisa/complete`,
  });
}));

router.post("/easypaisa/complete", asyncHandler(async (req, res) => {
  const { txnRefNo, status, message, paymentId } = req.body as Record<string, string>;
  const pid = paymentId || (await prisma.payment.findFirst({ where: { providerRef: txnRefNo } }))?.id;
  if (!pid) throw new ApiError(404, "Payment not found");
  if (status === "PAID" || status === "SUCCESS") {
    await prisma.$transaction([
      prisma.payment.update({ where: { id: pid }, data: { status: "PAID" } }),
      prisma.paymentAttempt.create({
        data: { paymentId: pid, method: "EASYPAISA", status: "SUCCESS", providerRef: txnRefNo },
      }),
    ]);
    res.json({ ok: true, status: "PAID" });
  } else {
    await prisma.paymentAttempt.create({
      data: { paymentId: pid, method: "EASYPAISA", status: "FAILED", providerRef: txnRefNo, error: message },
    });
    res.json({ ok: false, status: "FAILED", message });
  }
}));

router.post("/stripe/webhook", asyncHandler(async (req, res) => {
  if (!stripe) throw new ApiError(503, "Stripe is not configured");
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) throw new ApiError(400, "Missing stripe-signature");
  const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, config.stripeWebhookSecret!);
  } catch {
    throw new ApiError(400, "Invalid signature");
  }
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const payment = await prisma.payment.findFirst({ where: { providerRef: intent.id } });
    if (payment && payment.status !== "PAID") {
      await prisma.$transaction([
        prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID" } }),
        prisma.paymentAttempt.create({
          data: { paymentId: payment.id, method: "STRIPE", status: "SUCCESS", providerRef: intent.id },
        }),
      ]);
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    const payment = await prisma.payment.findFirst({ where: { providerRef: intent.id } });
    if (payment && payment.status === "PENDING") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    }
  }
  res.json({ received: true });
}));

router.get("/methods", requireAuth, asyncHandler(async (req, res) => {
  const methods = await prisma.payment.findMany({
    where: {
      booking: { userId: req.user!.id },
      status: "PAID",
    },
    select: { id: true, method: true, provider: true, providerRef: true, createdAt: true },
    distinct: ["method", "providerRef"],
    orderBy: { createdAt: "desc" },
  });
  res.json({ methods });
}));

router.post("/methods", requireAuth, validate(z.object({
  method: z.enum(["CARD", "STRIPE", "JAZZCASH", "EASYPAISA"]),
  providerRef: z.string().optional(),
  details: z.record(z.unknown()).optional(),
})), asyncHandler(async (req, res) => {
  const { method, providerRef, details } = getValidated<{ method: string; providerRef?: string; details?: Record<string, unknown> }>(req);
  const saved = await prisma.appSetting.create({
    data: {
      key: `payment_method_${req.user!.id}_${Date.now()}`,
      value: JSON.stringify({ userId: req.user!.id, method, providerRef, details, createdAt: new Date().toISOString() }),
      type: "JSON", group: "payment_methods",
    },
  });
  res.status(201).json({ id: saved.id, method, providerRef });
}));

router.delete("/methods/:id", requireAuth, asyncHandler(async (req, res) => {
  const setting = await prisma.appSetting.findFirst({
    where: { id: req.params.id, group: "payment_methods" },
  });
  if (!setting) throw new ApiError(404, "Payment method not found");
  const data = JSON.parse(setting.value);
  if (data.userId !== req.user!.id) throw new ApiError(403, "Forbidden");
  await prisma.appSetting.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

router.post("/process", requireAuth, validate(z.object({
  bookingId: z.string(),
  method: z.enum(["CASH", "CARD", "STRIPE", "JAZZCASH", "EASYPAISA"]),
  couponCode: z.string().optional(),
  redeemPoints: z.number().int().min(0).optional(),
  idempotencyKey: z.string().uuid().optional(),
})), asyncHandler(async (req, res) => {
  const { bookingId, method, couponCode, redeemPoints, idempotencyKey } = getValidated<{ bookingId: string; method: string; couponCode?: string; redeemPoints?: number; idempotencyKey?: string }>(req);

  if (idempotencyKey) {
    const existing = await prisma.payment.findFirst({ where: { providerRef: idempotencyKey } });
    if (existing) return res.json({ payment: existing, idempotent: true });
  }

  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
    if (!booking) throw new ApiError(404, "Booking not found");
    if (booking.payment) throw new ApiError(400, "Payment already exists for this booking");

    let total = booking.total;
    let discount = 0;
    let couponId: string | undefined;
    let pointsUsed = 0;

    if (couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (!coupon || !coupon.active) throw new ApiError(400, "Invalid coupon");
      if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new ApiError(400, "Coupon expired");
      if (coupon.maxUses && coupon.uses >= coupon.maxUses) throw new ApiError(400, "Coupon fully redeemed");
      discount = Math.min(coupon.type === "PERCENT" ? Math.round((total * coupon.value) / 100) : coupon.value, total);
      couponId = coupon.id;
      total -= discount;
      await tx.coupon.update({ where: { id: coupon.id }, data: { uses: { increment: 1 } } });
      await tx.couponUsage.create({ data: { couponId: coupon.id, userId: req.user!.id } });
    }

    if (redeemPoints && redeemPoints > 0) {
      const user = await tx.user.findUnique({ where: { id: req.user!.id }, select: { loyaltyPoints: true } });
      const maxRedeem = Math.min(redeemPoints, user?.loyaltyPoints ?? 0, total);
      if (maxRedeem > 0) {
        pointsUsed = maxRedeem;
        total -= maxRedeem;
        await tx.user.update({ where: { id: req.user!.id }, data: { loyaltyPoints: { decrement: maxRedeem } } });
        await tx.loyaltyTransaction.create({ data: { userId: req.user!.id, points: maxRedeem, reason: "REDEMPTION", type: "REDEEM" } });
      }
    }

    const payment = await tx.payment.create({
      data: { bookingId, method: method as any, status: "PENDING", amount: Math.max(0, total), providerRef: idempotencyKey || undefined },
    });

    if (couponId) {
      await tx.booking.update({ where: { id: bookingId }, data: { couponId, discount } });
    }

    if (method === "CASH") {
      const user = await tx.user.findUnique({ where: { id: req.user!.id }, select: { loyaltyPoints: true, loyaltyTier: true } });
      const pointsEarned = Math.floor(total * 0.05);
      await tx.loyaltyTransaction.create({ data: { userId: req.user!.id, points: pointsEarned, reason: "BOOKING", type: "EARN", bookingId } });
      await tx.user.update({ where: { id: req.user!.id }, data: { loyaltyPoints: { increment: pointsEarned } } });
    }

    return { payment, discount, pointsUsed, total };
  });

  res.status(201).json(result);
}));

router.post("/:id/confirm", requireAuth, asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { booking: true } });
  if (!payment) throw new ApiError(404, "Payment not found");
  if (payment.booking.userId !== req.user!.id && req.user!.role !== "ADMIN") throw new ApiError(403, "Forbidden");
  if (payment.status !== "PENDING") throw new ApiError(400, "Payment already processed");

  await prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID" } });
  await prisma.paymentAttempt.create({ data: { paymentId: payment.id, method: payment.method, status: "SUCCESS" } });

  const pointsEarned = Math.floor(payment.amount * 0.05);
  await prisma.loyaltyTransaction.create({ data: { userId: payment.booking.userId, points: pointsEarned, reason: "BOOKING", type: "EARN", bookingId: payment.bookingId } });
  await prisma.user.update({ where: { id: payment.booking.userId }, data: { loyaltyPoints: { increment: pointsEarned } } });

  res.json({ payment, loyaltyEarned: pointsEarned });
}));

router.post("/:id/refund", requireAuth, asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { booking: true } });
  if (!payment) throw new ApiError(404, "Payment not found");
  if (payment.status !== "PAID") throw new ApiError(400, "Only paid payments can be refunded");

  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } }),
    prisma.walletTransaction.create({ data: { userId: payment.booking.userId, type: "CREDIT", amount: payment.amount, balance: payment.amount, reason: "REFUND", bookingId: payment.bookingId } }),
    prisma.paymentAttempt.create({ data: { paymentId: payment.id, method: payment.method, status: "SUCCESS" } }),
  ]);
  res.json({ success: true });
}));

export default router;
