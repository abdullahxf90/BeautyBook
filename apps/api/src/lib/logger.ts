const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type Level = keyof typeof LOG_LEVELS;

const currentLevel: Level = (process.env.LOG_LEVEL as Level) || "info";

function log(level: Level, module: string, message: string, meta?: Record<string, unknown>) {
  if (LOG_LEVELS[level] > LOG_LEVELS[currentLevel]) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...(meta ? { meta } : {}),
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  error: (module: string, message: string, meta?: Record<string, unknown>) => log("error", module, message, meta),
  warn: (module: string, message: string, meta?: Record<string, unknown>) => log("warn", module, message, meta),
  info: (module: string, message: string, meta?: Record<string, unknown>) => log("info", module, message, meta),
  debug: (module: string, message: string, meta?: Record<string, unknown>) => log("debug", module, message, meta),
};
