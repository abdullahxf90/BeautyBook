import { Router, type Request } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { requireAuth } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";
import { config } from "../config";

const router = Router();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_WINDOW_MS = 15 * 60 * 1000;
const OTP_RESEND_LIMIT = 3;
const EMAIL_TOKEN_TTL_MS = 24 * 3600 * 1000;

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const requestMeta = (req: Request) => ({
  ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
  userAgent: (req.headers["user-agent"] as string) || null,
});

async function recordLogin(userId: string, req: Request, provider: string, success: boolean, failReason?: string) {
  const meta = requestMeta(req);
  await prisma.loginHistory.create({
    data: { userId, provider, success, failReason, ipAddress: meta.ipAddress, userAgent: meta.userAgent },
  }).catch(() => {});
  if (success) {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } }).catch(() => {});
  }
}

/** Rejects logins for suspended, banned, or deleted accounts. */
function assertAccountActive(user: { status: string }) {
  if (user.status === "SUSPENDED") throw new ApiError(403, "Your account is suspended. Contact support.");
  if (user.status === "BANNED") throw new ApiError(403, "Your account has been banned.");
  if (user.status === "DELETED") throw new ApiError(403, "This account has been deleted.");
}

/** Creates an OTP for the user after enforcing the resend limit; delivers it via in-app notification. */
async function issueOtp(userId: string, type: string, title: string) {
  const recent = await prisma.otpCode.count({
    where: { userId, type, used: false, createdAt: { gte: new Date(Date.now() - OTP_RESEND_WINDOW_MS) } },
  });
  if (recent >= OTP_RESEND_LIMIT) throw new ApiError(429, "Too many codes requested. Please wait before retrying.");
  const code = generateOtp();
  await prisma.otpCode.create({
    data: { userId, code, type, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  await prisma.notification.create({
    data: { userId, title, body: `Your BeautyBook verification code is ${code}. It expires in 5 minutes.` },
  });
  return code;
}

/** Verifies an OTP, enforcing expiry, single use and attempt limits. */
async function consumeOtp(userId: string, type: string, code: string) {
  const otp = await prisma.otpCode.findFirst({
    where: { userId, type, used: false, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new ApiError(400, "No active code found. Please request a new one.");
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new ApiError(429, "Too many incorrect attempts. Please request a new code.");
  if (otp.code !== code) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new ApiError(400, "Incorrect verification code");
  }
  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
}

/** Creates an email-verification token and delivers it via in-app notification. */
async function issueEmailVerification(userId: string) {
  const token = nanoid(32);
  await prisma.emailVerification.create({
    data: { userId, token, expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS) },
  });
  await prisma.notification.create({
    data: { userId, title: "Verify your email", body: `Use this token to verify your email address: ${token}` },
  });
  return token;
}

const publicUser = (u: { id: string; email: string; name: string; role: string; phone: string | null; avatarUrl: string | null; loyaltyPoints: number; emailVerified: boolean; phoneVerified: boolean; twoFactorEnabled: boolean }) => ({
  id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone,
  avatarUrl: u.avatarUrl, loyaltyPoints: u.loyaltyPoints, emailVerified: u.emailVerified,
  phoneVerified: u.phoneVerified, twoFactorEnabled: u.twoFactorEnabled,
});

async function issueTokens(user: { id: string; role: string }) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 3600 * 1000);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });
  return { accessToken, refreshToken };
}

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(10).max(16).optional(),
  password: z.string().min(8).max(100),
});

router.post("/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof registerSchema>>(req);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, "An account with this email already exists");
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, 10),
    },
  });
  await prisma.notification.create({
    data: { userId: user.id, title: "Welcome to BeautyBook", body: "Find. Book. Glow. Your beauty journey starts here." },
  });
  await issueEmailVerification(user.id);
  await recordLogin(user.id, req, "EMAIL", true);
  const tokens = await issueTokens(user);
  res.status(201).json({ user: publicUser(user), ...tokens });
}));

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = getValidated<z.infer<typeof loginSchema>>(req);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    if (user) await recordLogin(user.id, req, "EMAIL", false, "INVALID_CREDENTIALS");
    throw new ApiError(401, "Invalid email or password");
  }
  assertAccountActive(user);
  if (user.twoFactorEnabled) {
    await issueOtp(user.id, "LOGIN", "Your login code");
    const challengeToken = jwt.sign({ sub: user.id, purpose: "2FA" }, config.jwtSecret, { expiresIn: "10m" });
    return res.json({ requiresTwoFactor: true, challengeToken });
  }
  await recordLogin(user.id, req, "EMAIL", true);
  const tokens = await issueTokens(user);
  res.json({ user: publicUser(user), ...tokens });
}));

// Completes a login that was challenged with two-factor authentication
const verify2faSchema = z.object({ challengeToken: z.string(), code: z.string().length(6) });

router.post("/login/verify-2fa", validate(verify2faSchema), asyncHandler(async (req, res) => {
  const { challengeToken, code } = getValidated<z.infer<typeof verify2faSchema>>(req);
  let payload: { sub: string; purpose?: string };
  try { payload = jwt.verify(challengeToken, config.jwtSecret) as { sub: string; purpose?: string }; }
  catch { throw new ApiError(401, "Invalid or expired challenge. Please log in again."); }
  if (payload.purpose !== "2FA") throw new ApiError(401, "Invalid challenge token");
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new ApiError(404, "User not found");
  assertAccountActive(user);
  await consumeOtp(user.id, "LOGIN", code);
  await recordLogin(user.id, req, "EMAIL", true);
  const tokens = await issueTokens(user);
  res.json({ user: publicUser(user), ...tokens });
}));

router.post("/refresh", asyncHandler(async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) throw new ApiError(400, "refreshToken is required");
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) throw new ApiError(401, "Invalid refresh token");
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }
  await prisma.refreshToken.delete({ where: { token: refreshToken } });
  const tokens = await issueTokens({ id: payload.sub, role: payload.role });
  res.json(tokens);
}));

router.post("/logout", asyncHandler(async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.json({ ok: true });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new ApiError(404, "User not found");
  res.json({ user: publicUser(user) });
}));

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().min(10).max(16).optional(),
  avatarUrl: z.string().url().optional(),
});

router.patch("/me", requireAuth, validate(updateSchema), asyncHandler(async (req, res) => {
  const data = getValidated<z.infer<typeof updateSchema>>(req);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data });
  res.json({ user: publicUser(user) });
}));

const passwordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(100),
});

router.post("/change-password", requireAuth, validate(passwordSchema), asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = getValidated<z.infer<typeof passwordSchema>>(req);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError(400, "Current password is incorrect");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  res.json({ ok: true });
}));

// Forgot password — generates a reset token
router.post("/forgot-password", validate(z.object({ email: z.string().email() })), asyncHandler(async (req, res) => {
  const { email } = getValidated<{ email: string }>(req);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const resetToken = signAccessToken({ sub: user.id, role: user.role });
    await prisma.notification.create({
      data: { userId: user.id, title: "Password reset requested", body: `Use this token to reset: ${resetToken}` },
    });
  }
  // Always return OK to prevent email enumeration
  res.json({ ok: true });
}));

// Reset password
router.post("/reset-password", validate(z.object({ token: z.string(), password: z.string().min(8).max(100) })), asyncHandler(async (req, res) => {
  const { token, password } = getValidated<{ token: string; password: string }>(req);
  let payload;
  try { payload = verifyRefreshToken(token); } catch { throw new ApiError(400, "Invalid or expired reset token"); }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new ApiError(404, "User not found");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  res.json({ ok: true });
}));

// ─── Email verification ─────────────────────────

router.post("/verify-email", validate(z.object({ token: z.string().min(1) })), asyncHandler(async (req, res) => {
  const { token } = getValidated<{ token: string }>(req);
  const record = await prisma.emailVerification.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    throw new ApiError(400, "Invalid or expired verification token");
  }
  await prisma.emailVerification.update({ where: { id: record.id }, data: { used: true } });
  const user = await prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } });
  res.json({ user: publicUser(user) });
}));

router.post("/resend-verification", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (user.emailVerified) throw new ApiError(400, "Email is already verified");
  const pending = await prisma.emailVerification.count({
    where: { userId: user.id, used: false, createdAt: { gte: new Date(Date.now() - OTP_RESEND_WINDOW_MS) } },
  });
  if (pending >= OTP_RESEND_LIMIT) throw new ApiError(429, "Too many verification emails requested. Please wait before retrying.");
  await issueEmailVerification(user.id);
  res.json({ ok: true });
}));

// ─── Phone OTP verification ─────────────────────

router.post("/send-otp", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!user.phone) throw new ApiError(400, "Add a phone number to your profile first");
  if (user.phoneVerified) throw new ApiError(400, "Phone number is already verified");
  await issueOtp(user.id, "PHONE_VERIFICATION", "Verify your phone number");
  res.json({ ok: true });
}));

router.post("/verify-otp", requireAuth, validate(z.object({ code: z.string().length(6) })), asyncHandler(async (req, res) => {
  const { code } = getValidated<{ code: string }>(req);
  await consumeOtp(req.user!.id, "PHONE_VERIFICATION", code);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { phoneVerified: true } });
  res.json({ user: publicUser(user) });
}));

// ─── Two-factor authentication ──────────────────

router.post("/2fa/setup", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (user.twoFactorEnabled) throw new ApiError(400, "Two-factor authentication is already enabled");
  await issueOtp(user.id, "TWO_FACTOR_SETUP", "Enable two-factor authentication");
  res.json({ ok: true });
}));

router.post("/2fa/enable", requireAuth, validate(z.object({ code: z.string().length(6) })), asyncHandler(async (req, res) => {
  const { code } = getValidated<{ code: string }>(req);
  await consumeOtp(req.user!.id, "TWO_FACTOR_SETUP", code);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { twoFactorEnabled: true } });
  await prisma.securityLog.create({
    data: { userId: user.id, action: "TWO_FACTOR_ENABLE", ...requestMeta(req) },
  }).catch(() => {});
  res.json({ user: publicUser(user), twoFactorEnabled: true });
}));

router.post("/2fa/disable", requireAuth, validate(z.object({ password: z.string() })), asyncHandler(async (req, res) => {
  const { password } = getValidated<{ password: string }>(req);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new ApiError(400, "Incorrect password");
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false } });
  await prisma.securityLog.create({
    data: { userId: user.id, action: "TWO_FACTOR_DISABLE", ...requestMeta(req) },
  }).catch(() => {});
  res.json({ twoFactorEnabled: false });
}));

// ─── Social login (Google / Facebook / Apple) ───

interface SocialProfile { email: string; name: string; emailVerified: boolean; providerId?: string }

async function verifyGoogleToken(idToken: string): Promise<SocialProfile> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw new ApiError(401, "Invalid Google token");
  const info = (await res.json()) as { aud?: string; sub?: string; email?: string; email_verified?: string; name?: string };
  if (config.googleClientId && info.aud !== config.googleClientId) throw new ApiError(401, "Google token audience mismatch");
  if (!info.email) throw new ApiError(401, "Google token has no email");
  return { email: info.email, name: info.name || info.email.split("@")[0], emailVerified: info.email_verified === "true", providerId: info.sub };
}

async function verifyFacebookToken(accessToken: string): Promise<SocialProfile> {
  const res = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`);
  if (!res.ok) throw new ApiError(401, "Invalid Facebook token");
  const info = (await res.json()) as { id?: string; name?: string; email?: string };
  if (!info.id || !info.email) throw new ApiError(401, "Facebook account has no email available");
  return { email: info.email, name: info.name || info.email.split("@")[0], emailVerified: true, providerId: info.id };
}

async function verifyAppleToken(identityToken: string): Promise<SocialProfile> {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded === "string") throw new ApiError(401, "Invalid Apple token");
  const res = await fetch("https://appleid.apple.com/auth/keys");
  if (!res.ok) throw new ApiError(502, "Could not reach Apple key service");
  const { keys } = (await res.json()) as { keys: Array<{ kid: string } & crypto.JsonWebKey> };
  const jwk = keys.find((k) => k.kid === decoded.header.kid);
  if (!jwk) throw new ApiError(401, "Invalid Apple token key");
  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" }).export({ type: "spki", format: "pem" });
  let payload: { iss?: string; aud?: string; email?: string; email_verified?: string | boolean };
  try {
    payload = jwt.verify(identityToken, publicKey as string, { algorithms: ["RS256"] }) as typeof payload;
  } catch {
    throw new ApiError(401, "Invalid Apple token signature");
  }
  if (payload.iss !== "https://appleid.apple.com") throw new ApiError(401, "Invalid Apple token issuer");
  if (config.appleClientId && payload.aud !== config.appleClientId) throw new ApiError(401, "Apple token audience mismatch");
  if (!payload.email) throw new ApiError(401, "Apple token has no email");
  return {
    email: payload.email,
    name: payload.email.split("@")[0],
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
  };
}

const socialSchema = z.object({
  provider: z.enum(["GOOGLE", "FACEBOOK", "APPLE"]),
  token: z.string().min(1),
  name: z.string().min(2).max(80).optional(),
});

router.post("/social", validate(socialSchema), asyncHandler(async (req, res) => {
  const { provider, token, name } = getValidated<z.infer<typeof socialSchema>>(req);
  const profile =
    provider === "GOOGLE" ? await verifyGoogleToken(token)
    : provider === "FACEBOOK" ? await verifyFacebookToken(token)
    : await verifyAppleToken(token);

  const idField = provider === "GOOGLE" ? "googleId" : provider === "FACEBOOK" ? "facebookId" : null;
  let user = await prisma.user.findUnique({ where: { email: profile.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: name || profile.name,
        email: profile.email,
        emailVerified: profile.emailVerified,
        passwordHash: await bcrypt.hash(nanoid(32), 10),
        ...(idField && profile.providerId ? { [idField]: profile.providerId } : {}),
      },
    });
    await prisma.notification.create({
      data: { userId: user.id, title: "Welcome to BeautyBook", body: "Find. Book. Glow. Your beauty journey starts here." },
    });
  } else {
    assertAccountActive(user);
    const updates: Record<string, unknown> = {};
    if (profile.emailVerified && !user.emailVerified) updates.emailVerified = true;
    if (idField && profile.providerId && !(user as Record<string, unknown>)[idField]) updates[idField] = profile.providerId;
    if (Object.keys(updates).length) {
      user = await prisma.user.update({ where: { id: user.id }, data: updates });
    }
  }
  await recordLogin(user.id, req, provider, true);
  const tokens = await issueTokens(user);
  res.json({ user: publicUser(user), ...tokens });
}));

export default router;
