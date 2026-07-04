import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { requireAuth } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";
import { config } from "../config";

const router = Router();

const publicUser = (u: { id: string; email: string; name: string; role: string; phone: string | null; avatarUrl: string | null; loyaltyPoints: number; emailVerified: boolean }) => ({
  id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone,
  avatarUrl: u.avatarUrl, loyaltyPoints: u.loyaltyPoints, emailVerified: u.emailVerified,
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
  const tokens = await issueTokens(user);
  res.status(201).json({ user: publicUser(user), ...tokens });
}));

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = getValidated<z.infer<typeof loginSchema>>(req);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, "Invalid email or password");
  }
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

export default router;
