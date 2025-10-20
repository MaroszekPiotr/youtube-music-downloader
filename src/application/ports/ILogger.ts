// src/application/ports/ILogger.ts

/**
 * Logger port interface
 * Abstraction for logging functionality
 */
export interface ILogger {
  /**
   * Log debug message (detailed development info)
   */
  debug(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log informational message
   */
  info(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log error message with optional error object
   */
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;

  /**
   * Sets log level dynamically
   */
  setLevel(level: LogLevel): void;
}

/**
 * Available log levels
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
