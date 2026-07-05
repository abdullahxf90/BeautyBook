import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { errorHandler } from "./utils/http";
import authRoutes from "./routes/auth";
import metaRoutes from "./routes/meta";
import salonRoutes from "./routes/salons";
import bookingRoutes from "./routes/bookings";
import reviewRoutes from "./routes/reviews";
import favoriteRoutes from "./routes/favorites";
import couponRoutes from "./routes/coupons";
import notificationRoutes from "./routes/notifications";
import uploadRoutes from "./routes/uploads";
import adminRoutes from "./routes/admin";
import walletRoutes from "./routes/wallet";
import giftCardRoutes from "./routes/giftCards";
import membershipRoutes from "./routes/memberships";
import blogRoutes from "./routes/blog";
import aiRoutes from "./routes/ai";
import addressRoutes from "./routes/addresses";
import ownerRoutes from "./routes/owner";
import searchRoutes from "./routes/search";
import deviceRoutes from "./routes/devices";
import securityRoutes from "./routes/security";
import staffRoutes from "./routes/staff";
import crmRoutes from "./routes/crm";
import inventoryRoutes from "./routes/inventory";
import marketingRoutes from "./routes/marketing";
import chatRoutes from "./routes/chat";
import analyticsRoutes from "./routes/analytics";
import supportRoutes from "./routes/support";
import locationRoutes from "./routes/locations";
import cmsRoutes from "./routes/cms";
import settingsRoutes from "./routes/settings";
import referralRoutes from "./routes/referrals";
import permissionRoutes from "./routes/permissions";
import beautyRoutes from "./routes/beauty";
import paymentRoutes from "./routes/payments";
import insightRoutes from "./routes/insights";
import automationRoutes from "./routes/automation";
import reportRoutes from "./routes/reports";
import compareRoutes from "./routes/compare";
import loyaltyRoutes from "./routes/loyalty";
import discoveryRoutes from "./routes/discovery";

const app = express();

app.use(helmet());
// Local dev always accepts the local website; production origins come from CORS_ORIGIN.
const corsOrigins = new Set(config.corsOrigin.split(","));
if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
  corsOrigins.add("http://localhost:3000");
}
app.use(cors({ origin: [...corsOrigins], credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });

app.get("/health", (_req, res) => res.json({ ok: true, service: "beautybook-api" }));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/salons", salonRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/gift-cards", giftCardRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/marketing", marketingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/beauty", beautyRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/compare", compareRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/discovery", discoveryRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

// Only start the HTTP server when running locally (not in Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`BeautyBook API listening on http://localhost:${config.port}`);
  });
}

export default app;
