import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Supabase's session-mode pooler (port 5432) is hard-capped at 15 clients and
// leaked dev-server sessions exhaust it (EMAXCONNSESSION). Route through the
// transaction-mode pooler (port 6543, pgbouncer) instead, which multiplexes
// connections, and cap Prisma's own pool so Promise.all fan-outs queue rather
// than opening new connections.
function pooledUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname.endsWith("pooler.supabase.com") && url.port === "5432") {
      url.port = "6543";
      if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
    }
    if (!url.searchParams.has("connection_limit")) {
      // The transaction pooler (pgbouncer) multiplexes, so a slightly larger
      // Prisma pool is safe and gives headroom for cold-start request bursts
      // (Next SSR compiling several routes at once) without pool-timeout 500s.
      url.searchParams.set("connection_limit", "10");
      url.searchParams.set("pool_timeout", "20");
      url.searchParams.set("connect_timeout", "20");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(pooledUrl() ? { datasources: { db: { url: pooledUrl() } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";
