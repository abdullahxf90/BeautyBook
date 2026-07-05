import { getRedis } from "./redis";

type JobHandler = (payload: any) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJob(type: string, handler: JobHandler) {
  handlers.set(type, handler);
}

export async function enqueue(type: string, payload: any, delayMs = 0): Promise<void> {
  const redis = await getRedis();
  if (!redis) {
    console.warn(`[Queue] Redis unavailable, running job inline: ${type}`);
    await processJob(type, payload);
    return;
  }
  const job = JSON.stringify({ type, payload, createdAt: Date.now() });
  if (delayMs > 0) {
    await redis.zadd("queue:delayed", Date.now() + delayMs, job);
  } else {
    await redis.lpush("queue:jobs", job);
  }
}

export async function processNext(): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;
  const jobRaw = await redis.rpop("queue:jobs");
  if (!jobRaw) return false;
  const { type, payload } = JSON.parse(jobRaw);
  await processJob(type, payload);
  return true;
}

async function processJob(type: string, payload: any): Promise<void> {
  const handler = handlers.get(type);
  if (!handler) {
    console.error(`[Queue] No handler for job type: ${type}`);
    const redis = await getRedis();
    if (redis) await redis.lpush("queue:dead", JSON.stringify({ type, payload, error: "No handler" }));
    return;
  }
  try {
    await handler(payload);
  } catch (err: any) {
    console.error(`[Queue] Job failed: ${type}`, err.message);
    const redis = await getRedis();
    if (redis) {
      const dlq = JSON.stringify({ type, payload, error: err.message, failedAt: Date.now() });
      await redis.lpush("queue:dead", dlq);
    }
  }
}

export { getRedis } from "./redis";
