const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function stringifyArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === "object") return JSON.stringify(a, null, 2);
      return String(a);
    })
    .join(" ");
}

export const logger = {
  debug(...args: unknown[]): void {
    if (shouldLog("debug")) {
      console.debug(`[${formatTimestamp()}] [DEBUG]`, stringifyArgs(args));
    }
  },
  info(...args: unknown[]): void {
    if (shouldLog("info")) {
      console.info(`[${formatTimestamp()}] [INFO]`, stringifyArgs(args));
    }
  },
  warn(...args: unknown[]): void {
    if (shouldLog("warn")) {
      console.warn(`[${formatTimestamp()}] [WARN]`, stringifyArgs(args));
    }
  },
  error(...args: unknown[]): void {
    if (shouldLog("error")) {
      console.error(`[${formatTimestamp()}] [ERROR]`, stringifyArgs(args));
    }
  },
};
