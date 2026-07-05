import { prisma } from "@beautybook/database";
import { processNext } from "./lib/queue";

async function cleanupExpiredLocks() {
  try {
    const result = await prisma.slotLock.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      console.log(`[Worker] Cleaned up ${result.count} expired slot locks`);
    }
  } catch (err) {
    console.error("[Worker] Error cleaning up expired locks:", err);
  }
}

async function main() {
  console.log("[Worker] Started — waiting for jobs...");
  cleanupExpiredLocks();
  setInterval(cleanupExpiredLocks, 5 * 60 * 1000);
  setInterval(async () => {
    try {
      await processNext();
    } catch (err) {
      console.error("[Worker] Error processing job:", err);
    }
  }, 1000);
}

main().catch(console.error);
