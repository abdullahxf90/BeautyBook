import { Request, Response, NextFunction } from "express";

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  if (!origin && !referer) return next();
  const allowedOrigins = [
    "http://localhost:3000",
    "https://beauty-book-blue.vercel.app",
    "https://beauty-book.com",
    "https://api.beauty-book.com",
  ];
  const source = origin || referer || "";
  const matches = allowedOrigins.some((o) => source.startsWith(o));
  if (!matches) {
    return res.status(403).json({ error: "CSRF validation failed" });
  }
  next();
}
