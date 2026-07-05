interface MetricPoint {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

const metrics: MetricPoint[] = [];

const MAX_METRICS = 10000;

export function recordMetric(name: string, value: number, tags?: Record<string, string>) {
  metrics.push({ name, value, tags, timestamp: Date.now() });
  if (metrics.length > MAX_METRICS) metrics.shift();
}

export function getMetrics(since = Date.now() - 3600000) {
  return metrics.filter((m) => m.timestamp >= since);
}

export function getMetricsSummary(since = Date.now() - 3600000) {
  const filtered = metrics.filter((m) => m.timestamp >= since);
  const summary: Record<string, { count: number; sum: number; avg: number; min: number; max: number }> = {};
  for (const m of filtered) {
    if (!summary[m.name]) summary[m.name] = { count: 0, sum: 0, avg: 0, min: Infinity, max: -Infinity };
    const s = summary[m.name];
    s.count++;
    s.sum += m.value;
    s.min = Math.min(s.min, m.value);
    s.max = Math.max(s.max, m.value);
  }
  for (const key of Object.keys(summary)) {
    summary[key].avg = Math.round((summary[key].sum / summary[key].count) * 100) / 100;
    if (summary[key].min === Infinity) summary[key].min = 0;
    if (summary[key].max === -Infinity) summary[key].max = 0;
  }
  return summary;
}

export function clearMetrics() {
  metrics.length = 0;
}
