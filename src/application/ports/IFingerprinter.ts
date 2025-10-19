import { Result } from '@shared/types/Result.js';

/**
 * Fingerprinter port interface
 * Defines contract for audio fingerprinting service
 */
export interface IFingerprinter {
  /**
   * Generates audio fingerprint from file
   * @param filePath - Path to audio file
   * @returns Result with fingerprint string or error
   */
  generateFingerprint(filePath: string): Promise<Result<string, Error>>;

  /**
   * Compares two fingerprints and returns similarity score
   * @param fingerprint1 - First fingerprint
   * @param fingerprint2 - Second fingerprint
   * @returns Similarity score between 0.0 and 1.0
   */
  compareSimilarity(fingerprint1: string, fingerprint2: string): number;
}
