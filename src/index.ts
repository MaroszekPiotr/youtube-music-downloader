/**
 * Main entry point for YouTube Music Downloader library
 * @module index
 */

export { DIContainer } from './shared/di/container.js';
export type { ILogger } from './application/ports/ILogger.js';
export type { IFingerprinter } from './application/ports/IFingerprinter.js';

/**
 * Library version
 */
export const VERSION = '1.0.0';
