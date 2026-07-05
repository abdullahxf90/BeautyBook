import { getRedis } from "./redis";

const DEFAULT_TTL = 300;

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const r = await getRedis();
    if (!r) return null;
    const raw = await r.get(`cache:${key}`);
    return raw ? JSON.parse(raw) : null;
  },

  async set(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
    const r = await getRedis();
    if (!r) return;
    await r.setex(`cache:${key}`, ttl, JSON.stringify(value));
  },

  async del(key: string): Promise<void> {
    const r = await getRedis();
    if (!r) return;
    await r.del(`cache:${key}`);
  },

  async delPattern(pattern: string): Promise<void> {
    const r = await getRedis();
    if (!r) return;
    const keys = await r.keys(`cache:${pattern}`);
    if (keys.length) await r.del(keys);
  },

  async remember<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await fn();
    await this.set(key, fresh, ttl);
    return fresh;
  },
};
