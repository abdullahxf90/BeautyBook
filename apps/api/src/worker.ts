import { prisma } from "@beautybook/database";
import { processNext } from "./lib/queue";
import { computeDailyStats, computeUserMetrics, computeSalonMetrics } from "./lib/analytics";

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

async function runDailyAggregation() {
  try {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    if (hour === 0 && minute < 5) {
      console.log("[Worker] Running daily aggregation...");
      await computeDailyStats(now);
      console.log("[Worker] Daily stats computed");
    }

    if (hour % 6 === 0 && minute < 5) {
      console.log("[Worker] Computing user & salon metrics...");
      await Promise.all([computeUserMetrics(), computeSalonMetrics()]);
      console.log("[Worker] Metrics computed");
    }
  } catch (err) {
    console.error("[Worker] Error in daily aggregation:", err);
  }
}

async function main() {
  console.log("[Worker] Started — waiting for jobs...");
  cleanupExpiredLocks();
  runDailyAggregation();

  setInterval(cleanupExpiredLocks, 5 * 60 * 1000);
  setInterval(runDailyAggregation, 5 * 60 * 1000);

  setInterval(async () => {
    try {
      await processNext();
    } catch (err) {
      console.error("[Worker] Error processing job:", err);
    }
  }, 1000);
}

main().catch(console.error);
