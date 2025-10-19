import { promisify } from 'util';
import { IFingerprinter } from '@application/ports/IFingerprinter.js';
import { Result } from '@shared/types/Result.js';
import { injectable } from 'inversify';

// Import raw fpcalc (CommonJS)
import fpcalcCallback from 'fpcalc';

// Promisify callback-based API
const fpcalc = promisify<string, FpcalcOptions, FpcalcResult>(
  fpcalcCallback as (file: string, options: FpcalcOptions, callback: (err: Error | null, result: FpcalcResult) => void) => void
);

interface FpcalcOptions {
  length?: number;
  raw?: boolean;
  command?: string;
}

interface FpcalcResult {
  file: string;
  duration: number;
  fingerprint: string | Buffer;
}

/**
 * Chromaprint fingerprinter using fpcalc binary
 * Infrastructure layer adapter for IFingerprinter port
 */
@injectable()
export class FpcalcFingerprinter implements IFingerprinter {
  private readonly fpcalcCommand: string;
  private readonly fpcalcAsync: (file: string, options: FpcalcOptions) => Promise<FpcalcResult>;

  constructor(fpcalcCommand: string = 'fpcalc') {
    this.fpcalcCommand = fpcalcCommand;
    this.fpcalcAsync = promisify(fpcalc);
  }

  /**
   * Generates audio fingerprint from file using Chromaprint
   */
  public async generateFingerprint(filePath: string): Promise<Result<string, Error>> {
    try {
      const result = await fpcalc(filePath, {
        command: this.fpcalcCommand,
        raw: false, // Return compressed fingerprint string
      });

      if (!result.fingerprint || typeof result.fingerprint !== 'string') {
        return Result.fail(new Error('Invalid fingerprint format'));
      }

      return Result.ok(result.fingerprint);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Fingerprint generation failed: ${message}`));
    }
  }

  /**
   * Compares two Chromaprint fingerprints
   * Uses Hamming distance for similarity calculation
   */
  public compareSimilarity(fingerprint1: string, fingerprint2: string): number {
    // Simplified similarity - in production use proper Chromaprint comparison
    // This is a placeholder - we'll implement proper comparison in Task 2
    const minLength = Math.min(fingerprint1.length, fingerprint2.length);
    let matches = 0;

    for (let i = 0; i < minLength; i++) {
      if (fingerprint1[i] === fingerprint2[i]) {
        matches++;
      }
    }

    return matches / Math.max(fingerprint1.length, fingerprint2.length);
  }
}
