/**
 * Shared Logger Utility
 * Provides consistent logging across the application
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LoggerOptions {
  prefix?: string;
  enableDevelopmentLogs?: boolean;
}

export class Logger {
  private prefix: string;
  private enableDevelopmentLogs: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || 'App';
    this.enableDevelopmentLogs = options.enableDevelopmentLogs ?? true;
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === 'error' || level === 'warn') {
      return true; // Always log errors and warnings
    }
    return this.enableDevelopmentLogs && process.env.NODE_ENV === 'development';
  }

  private formatMessage(message: string): string {
    return `[${this.prefix}] ${message}`;
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage(message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(message), ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage(message), ...args);
    }
  }
}

/**
 * Create a logger instance with a specific prefix
 */
export function createLogger(prefix: string, options?: Omit<LoggerOptions, 'prefix'>): Logger {
  return new Logger({ ...options, prefix });
}
