import path from "path";
import fs from "fs";

// Load the repo-root .env for local development (Vercel/production set real env vars).
// Only fills in variables that are not already set, so platform env always wins.
if (!process.env.VERCEL) {
  for (const envPath of [path.resolve(__dirname, "../../../.env"), path.resolve(process.cwd(), ".env")]) {
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      const [, key, raw] = m;
      if (process.env[key] === undefined) {
        process.env[key] = raw.replace(/^["']|["']$/g, "");
      }
    }
    break;
  }
}

export const config = {
  port: parseInt(process.env.API_PORT || "4000", 10),
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-only-refresh-secret",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  accessTokenTtl: "15m",
  refreshTokenTtlDays: 30,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  jazzcashMerchantId: process.env.JAZZCASH_MERCHANT_ID || "",
  jazzcashPassword: process.env.JAZZCASH_PASSWORD || "",
  easypaisaMerchantId: process.env.EASYPAISA_MERCHANT_ID || "",
  easypaisaEndpoint: process.env.EASYPAISA_ENDPOINT || "",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:4000",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  facebookAppId: process.env.FACEBOOK_APP_ID || "",
  appleClientId: process.env.APPLE_CLIENT_ID || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "BeautyBook <onboarding@resend.dev>",
  sentryDsn: process.env.SENTRY_DSN || "",
  nodeEnv: process.env.NODE_ENV || "development",
};
