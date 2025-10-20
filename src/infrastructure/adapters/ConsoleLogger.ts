// src/infrastructure/adapters/ConsoleLogger.ts

import type { ILogger, LogLevel } from '@application/ports/ILogger.js';
import { injectable } from 'inversify';
import chalk from 'chalk';

/**
 * Simple console logger for development
 * Will be replaced with full implementation in Task 12
 */
@injectable()
export class ConsoleLogger implements ILogger {
  private currentLevel: LogLevel = 'INFO' as LogLevel;

  public debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('DEBUG')) {
      console.log(chalk.gray(`[DEBUG] ${message}`), meta || '');
    }
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('INFO')) {
      console.log(chalk.blue(`[INFO] ${message}`), meta || '');
    }
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('WARN')) {
      console.log(chalk.yellow(`[WARN] ${message}`), meta || '');
    }
  }

  public error(
    message: string,
    error?: Error,
    meta?: Record<string, unknown>
  ): void {
    if (this.shouldLog('ERROR')) {
      console.error(chalk.red(`[ERROR] ${message}`));
      if (error) {
        console.error(chalk.red(error.stack || error.message));
      }
      if (meta) {
        console.error(meta);
      }
    }
  }

  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private shouldLog(level: string): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const currentIndex = levels.indexOf(this.currentLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }
}
