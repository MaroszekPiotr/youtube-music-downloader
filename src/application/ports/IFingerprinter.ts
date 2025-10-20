// src/application/ports/IFingerprinter.ts

import type { Result } from '@shared/types/Result.js';

/**
 * Fingerprint generation options
 */
export interface FingerprintOptions {
  /**
   * Length of audio to analyze in seconds
   */
  readonly length?: number;

  /**
   * Use cache for repeated operations
   */
  readonly useCache?: boolean;

  /**
   * Raw binary fingerprint format
   */
  readonly raw?: boolean;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
}

/**
 * Fingerprinter port interface
 * Defines contract for audio fingerprinting service
 */
export interface IFingerprinter {
  /**
   * Generates audio fingerprint from file
   * @param filePath - Path to audio file
   * @param options - Optional fingerprinting configuration
   * @returns Result with fingerprint string or error
   */
  generateFingerprint(
    filePath: string,
    options?: FingerprintOptions
  ): Promise<Result<string, Error>>;

  /**
   * Compares two fingerprints and returns similarity score
   * @param fingerprint1 - First fingerprint
   * @param fingerprint2 - Second fingerprint
   * @returns Similarity score between 0.0 and 1.0
   */
  compareSimilarity(fingerprint1: string, fingerprint2: string): number;

  /**
   * Clears internal cache
   */
  clearCache(): void;

  /**
   * Gets cache statistics
   */
  getCacheStats(): CacheStats;
}
