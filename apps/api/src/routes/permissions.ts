import { Router } from "express";
import { z } from "zod";
import { prisma } from "@beautybook/database";
import { ApiError, asyncHandler } from "../utils/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { getValidated, validate } from "../middleware/validate";

const router = Router();
router.use(requireAuth);

const RoleValues = ["CUSTOMER", "OWNER", "STAFF", "RECEPTIONIST", "MANAGER", "ADMIN", "SUPER_ADMIN"] as const;

router.get("/", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (_req, res) => {
  const permissions = await prisma.permission.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }] });
  res.json({ permissions });
}));

router.get("/roles", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (_req, res) => {
  const roles = await prisma.rolePermission.findMany({
    include: { permission: true },
    orderBy: { role: "asc" },
  });
  const grouped: Record<string, { role: string; permissions: { id: string; name: string; slug: string }[] }> = {};
  for (const rp of roles) {
    const key = rp.role;
    if (!grouped[key]) grouped[key] = { role: key, permissions: [] };
    grouped[key].permissions.push({ id: rp.permission.id, name: rp.permission.name, slug: rp.permission.slug });
  }
  res.json({ roles: Object.values(grouped) });
}));

const updateRoleSchema = z.object({
  permissionIds: z.array(z.string()),
});

router.put("/roles/:role", requireRole("ADMIN", "SUPER_ADMIN"), validate(updateRoleSchema), asyncHandler(async (req, res) => {
  const { role } = req.params;
  if (!RoleValues.includes(role as typeof RoleValues[number])) throw new ApiError(400, `Invalid role: ${role}`);
  const { permissionIds } = getValidated<z.infer<typeof updateRoleSchema>>(req);
  const existing = await prisma.permission.count({ where: { id: { in: permissionIds } } });
  if (existing !== permissionIds.length) throw new ApiError(400, "One or more permissions not found");
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { role: role as any } }),
    ...permissionIds.map((permissionId) =>
      prisma.rolePermission.create({ data: { role: role as any, permissionId } })
    ),
  ]);
  res.json({ ok: true, role, permissionCount: permissionIds.length });
}));

router.get("/users/:userId/roles", requireRole("ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId: req.params.userId },
    select: { role: true },
  });
  res.json({ userId: req.params.userId, roles: userRoles.map((ur) => ur.role) });
}));

const updateUserRolesSchema = z.object({
  roles: z.array(z.enum(RoleValues)).min(1),
});

router.put("/users/:userId/roles", requireRole("ADMIN", "SUPER_ADMIN"), validate(updateUserRolesSchema), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { roles } = getValidated<z.infer<typeof updateUserRolesSchema>>(req);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    ...roles.map((role) =>
      prisma.userRole.create({ data: { userId, role } })
    ),
  ]);
  const primaryRole = roles[0];
  await prisma.user.update({ where: { id: userId }, data: { role: primaryRole as any } });
  res.json({ ok: true, userId, roles });
}));

router.get("/my-permissions", asyncHandler(async (req, res) => {
  const role = req.user!.role;
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { role: role as any },
    include: { permission: true },
  });
  res.json({
    role,
    permissions: rolePermissions.map((rp) => ({
      id: rp.permission.id, name: rp.permission.name, slug: rp.permission.slug, group: rp.permission.group,
    })),
  });
}));

export default router;
