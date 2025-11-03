/**
 * Central logging utility for Vibeman
 * Provides consistent logging across the application with environment-based control
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private enabledLevels: Set<LogLevel>;

  constructor() {
    // Default: enable all levels in development, only warn/error in production
    this.enabledLevels = this.isDevelopment
      ? new Set<LogLevel>(['debug', 'info', 'warn', 'error'])
      : new Set<LogLevel>(['warn', 'error']);
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.enabledLevels.has('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.enabledLevels.has('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.enabledLevels.has('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.enabledLevels.has('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }

  /**
   * Enable or disable specific log levels
   */
  setLevel(level: LogLevel, enabled: boolean): void {
    if (enabled) {
      this.enabledLevels.add(level);
    } else {
      this.enabledLevels.delete(level);
    }
  }
}

// Singleton instance
export const logger = new Logger();
