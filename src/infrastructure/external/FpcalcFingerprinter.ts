// src/infrastructure/external/FpcalcFingerprinter.ts

import { promisify } from 'util';
import fs from 'fs/promises';
import type {
  IFingerprinter,
  FingerprintOptions,
  CacheStats,
} from '@application/ports/IFingerprinter.js';
import type { ILogger } from '@application/ports/ILogger.js';
import { Result } from '@shared/types/Result.js';
import { injectable, inject } from 'inversify';
import { TYPES } from '@shared/di/types.js';
import fpcalcCallback from 'fpcalc';

// Promisify callback-based API
const fpcalc = promisify<string, FpcalcNativeOptions, FpcalcNativeResult>(
  fpcalcCallback as (
    file: string,
    options: FpcalcNativeOptions,
    callback: (err: Error | null, result: FpcalcNativeResult) => void
  ) => void
);

interface FpcalcNativeOptions {
  readonly length?: number;
  readonly raw?: boolean;
  readonly command?: string;
}

interface FpcalcNativeResult {
  readonly file: string;
  readonly duration: number;
  readonly fingerprint: string | Buffer;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  readonly fingerprint: string;
  readonly timestamp: number;
}

/**
 * Chromaprint fingerprinter using fpcalc binary
 * Infrastructure layer adapter implementing IFingerprinter port
 */
@injectable()
export class FpcalcFingerprinter implements IFingerprinter {
  private readonly cache: Map<string, CacheEntry>;
  private readonly fpcalcCommand: string;
  private cacheHits: number;
  private cacheMisses: number;

  private static readonly DEFAULT_LENGTH = 60;
  private static readonly CACHE_TTL_MS = 3600000; // 1 hour

  constructor(
    @inject(TYPES.Logger) private readonly logger: ILogger,
    fpcalcCommand: string = 'fpcalc'
  ) {
    this.fpcalcCommand = fpcalcCommand;
    this.cache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;

    this.logger.debug('FpcalcFingerprinter initialized', { fpcalcCommand });
  }

  /**
   * Generates audio fingerprint from file using Chromaprint
   */
  public async generateFingerprint(
    filePath: string,
    options: FingerprintOptions = {}
  ): Promise<Result<string, Error>> {
    const useCache = options.useCache ?? true;
    const length = options.length ?? FpcalcFingerprinter.DEFAULT_LENGTH;
    const raw = options.raw ?? false;

    // Build cache key
    const cacheKey = this.buildCacheKey(filePath, length, raw);

    // Check cache first
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.cacheHits++;
        this.logger.debug(`Fingerprint cache hit: ${filePath}`, { length });
        return Result.ok(cached);
      }
      this.cacheMisses++;
    }

    // Validate file exists
    const fileExistsResult = await this.validateFileExists(filePath);
    if (fileExistsResult.isFailure()) {
      this.logger.error(
        `File validation failed: ${filePath}`,
        fileExistsResult.getError()
      );
      return Result.fail(fileExistsResult.getError());
    }

    // Generate fingerprint
    this.logger.info(`Generating fingerprint: ${filePath}`, { length, raw });

    try {
      const result = await fpcalc(filePath, {
        length,
        raw,
        command: this.fpcalcCommand,
      });

      // Convert Buffer to string if raw
      let fingerprintValue: string;
      if (typeof result.fingerprint === 'string') {
        fingerprintValue = result.fingerprint;
      } else if (Buffer.isBuffer(result.fingerprint)) {
        fingerprintValue = result.fingerprint.toString('base64');
      } else {
        return Result.fail(new Error('Invalid fingerprint format'));
      }

      // Validate fingerprint
      if (!fingerprintValue || fingerprintValue.length < 100) {
        this.logger.error(
          `Invalid fingerprint generated: ${filePath}`,
          undefined,
          { length: fingerprintValue?.length || 0 }
        );
        return Result.fail(new Error('Generated fingerprint is too short'));
      }

      // Store in cache
      if (useCache) {
        this.cache.set(cacheKey, {
          fingerprint: fingerprintValue,
          timestamp: Date.now(),
        });
        this.logger.debug(`Cached fingerprint: ${filePath}`);
      }

      this.logger.info(`Fingerprint generated successfully: ${filePath}`, {
        duration: result.duration,
        fingerprintLength: fingerprintValue.length,
      });

      return Result.ok(fingerprintValue);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Fingerprint generation failed: ${filePath}`,
        error as Error
      );
      return Result.fail(
        new Error(`Fingerprint generation failed: ${errorMessage}`)
      );
    }
  }

  /**
   * Compares two Chromaprint fingerprints
   * Uses simple character-by-character comparison
   * 
   * Note: This is a simplified implementation.
   * Production use should implement proper Chromaprint comparison algorithm.
   */
  public compareSimilarity(fingerprint1: string, fingerprint2: string): number {
    // Handle edge cases
    if (!fingerprint1 || !fingerprint2) {
      this.logger.warn('Attempted to compare empty fingerprints');
      return 0.0;
    }

    if (fingerprint1 === fingerprint2) {
      return 1.0;
    }

    // Calculate similarity using character-level comparison
    const minLength = Math.min(fingerprint1.length, fingerprint2.length);
    const maxLength = Math.max(fingerprint1.length, fingerprint2.length);
    let matches = 0;

    for (let i = 0; i < minLength; i++) {
      if (fingerprint1[i] === fingerprint2[i]) {
        matches++;
      }
    }

    const similarity = matches / maxLength;

    this.logger.debug('Fingerprint comparison completed', {
      similarity,
      fp1Length: fingerprint1.length,
      fp2Length: fingerprint2.length,
    });

    return similarity;
  }

  /**
   * Clears internal cache
   */
  public clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.logger.info(`Fingerprint cache cleared`, { entriesRemoved: size });
  }

  /**
   * Gets cache statistics
   */
  public getCacheStats(): CacheStats {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate * 10000) / 10000, // 4 decimal places
    };
  }

  /**
   * Validates file exists and is readable
   */
  private async validateFileExists(
    filePath: string
  ): Promise<Result<void, Error>> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new Error(`File not found or not readable: ${filePath}`)
      );
    }
  }

  /**
   * Builds cache key from parameters
   */
  private buildCacheKey(
    filePath: string,
    length: number,
    raw: boolean
  ): string {
    return `${filePath}:${length}:${raw}`;
  }

  /**
   * Retrieves fingerprint from cache if valid (not expired)
   */
  private getFromCache(cacheKey: string): string | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    const age = Date.now() - entry.timestamp;
    if (age > FpcalcFingerprinter.CACHE_TTL_MS) {
      this.cache.delete(cacheKey);
      this.logger.debug(`Cache entry expired: ${cacheKey}`);
      return null;
    }

    return entry.fingerprint;
  }
}
