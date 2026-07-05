import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Supabase's session-mode pooler has a small per-user connection cap; without an
// explicit limit Prisma opens num_cpus*2+1 connections and heavy Promise.all
// fan-outs (admin dashboard, analytics) intermittently fail with P1001.
function pooledUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("connection_limit=")) return url;
  return url + (url.includes("?") ? "&" : "?") + "connection_limit=5&pool_timeout=30&connect_timeout=30";
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(pooledUrl() ? { datasources: { db: { url: pooledUrl() } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";
