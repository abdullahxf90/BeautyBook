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

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin.split(","), credentials: true }));
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

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`BeautyBook API listening on http://localhost:${config.port}`);
});
