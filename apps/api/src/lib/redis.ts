let redisClient: any = null;

export async function getRedis(): Promise<any> {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    const { Redis } = await import("ioredis");
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 100, 3000);
      },
      lazyConnect: false,
    });
    redisClient.on("error", (err: Error) => console.error("[Redis]", err.message));
    redisClient.on("connect", () => console.log("[Redis] Connected"));
    await redisClient.ping();
    return redisClient;
  } catch {
    console.warn("[Redis] Not available — running without cache");
    return null;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
}
