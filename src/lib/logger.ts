/**
 * Central logging utility for Vibeman
 *
 * Provides structured, consistent logging across the application:
 * - Environment-based log level control (LOG_LEVEL env var or NODE_ENV defaults)
 * - Automatic redaction of sensitive fields (passwords, tokens, API keys)
 * - Child loggers with prefixed context for scoped logging
 * - Duration tracking via startTimer() for measuring operation performance
 * - Structured context objects attached to every log entry
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

/** Numeric priority for log level comparison */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Keys whose values should be redacted in log output */
const SENSITIVE_KEYS = /^(password|secret|token|apikey|api_key|authorization|cookie|credential|private_key|access_token|refresh_token|client_secret|session_token|bearer)$/i;

/** Values that look like secrets (long hex/base64 strings) */
const SENSITIVE_VALUE_PATTERNS = [
  /^(sk|pk|api|key|token|secret|bearer)[-_]/i,
  /^[A-Za-z0-9+/]{40,}={0,2}$/, // base64 strings 40+ chars
];

/** Redact sensitive values from log context objects */
function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 8) return '[nested]';
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(item => redactSensitive(item, depth + 1));

  // Handle Error objects specially
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      ...(obj.stack ? { stack: obj.stack.split('\n').slice(0, 5).join('\n') } : {}),
    };
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string' && SENSITIVE_VALUE_PATTERNS.some(p => p.test(value))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Resolve the minimum log level from environment */
function resolveMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel as LogLevel;
  }
  return process.env.NODE_ENV === 'development' ? 'debug' : 'warn';
}

export interface TimerResult {
  durationMs: number;
  /** Pre-formatted duration string like "123ms" or "1.5s" */
  duration: string;
}

class Logger {
  private minLevel: LogLevel;
  private prefix: string;
  private defaultContext: LogContext;

  constructor(prefix = '', defaultContext: LogContext = {}) {
    this.minLevel = resolveMinLevel();
    this.prefix = prefix;
    this.defaultContext = defaultContext;
  }

  /**
   * Create a child logger with a prefix and optional default context.
   * All log messages from the child will be prefixed, and the default context
   * is merged into every log entry.
   *
   * @example
   * const log = logger.child('conductor', { runId: '123' });
   * log.info('Phase started'); // [INFO] [conductor] Phase started {"runId":"123"}
   */
  child(prefix: string, defaultContext: LogContext = {}): Logger {
    const fullPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    const mergedContext = { ...this.defaultContext, ...defaultContext };
    const child = new Logger(fullPrefix, mergedContext);
    child.minLevel = this.minLevel;
    return child;
  }

  /**
   * Start a timer for measuring operation duration.
   * Returns a function that, when called, returns the elapsed time.
   *
   * @example
   * const elapsed = logger.startTimer();
   * await doWork();
   * const { durationMs, duration } = elapsed();
   * logger.info('Work complete', { durationMs }); // "Work complete {"durationMs":142}"
   */
  startTimer(): () => TimerResult {
    const start = performance.now();
    return () => {
      const durationMs = Math.round(performance.now() - start);
      const duration = durationMs >= 1000
        ? `${(durationMs / 1000).toFixed(1)}s`
        : `${durationMs}ms`;
      return { durationMs, duration };
    };
  }

  private isEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefixStr = this.prefix ? ` [${this.prefix}]` : '';

    // Merge default context with provided context
    let mergedContext: unknown = context;
    if (Object.keys(this.defaultContext).length > 0) {
      if (typeof context === 'object' && context !== null && !Array.isArray(context)) {
        mergedContext = { ...this.defaultContext, ...context as Record<string, unknown> };
      } else if (context === undefined) {
        mergedContext = this.defaultContext;
      }
    }

    let contextStr = '';
    if (mergedContext !== undefined) {
      try {
        if (typeof mergedContext === 'object' && mergedContext !== null) {
          contextStr = ` ${JSON.stringify(redactSensitive(mergedContext))}`;
        } else {
          contextStr = ` ${String(mergedContext)}`;
        }
      } catch {
        contextStr = ` [object]`;
      }
    }
    return `[${timestamp}] [${level.toUpperCase()}]${prefixStr} ${message}${contextStr}`;
  }

  debug(message: string, context?: unknown): void {
    if (this.isEnabled('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: unknown): void {
    if (this.isEnabled('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: unknown): void {
    if (this.isEnabled('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: unknown): void {
    if (this.isEnabled('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }

  /**
   * Set the minimum log level. Levels below this threshold are silently dropped.
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// Singleton instance
export const logger = new Logger();

// Re-export for type usage
export type { Logger };
