/**
 * Type definitions for fpcalc 1.1.2
 * Project: https://github.com/parshap/node-fpcalc
 * Definitions by: YouTube Music Downloader Team
 */

declare module 'fpcalc' {
  /**
   * Options for fpcalc fingerprint calculation
   */
  interface FpcalcOptions {
    /**
     * Length of audio data to analyze (in seconds)
     */
    length?: number;
    
    /**
     * Return raw uncompressed fingerprint as Buffer
     * @default false
     */
    raw?: boolean;
    
    /**
     * Path to fpcalc executable
     * @default "fpcalc"
     */
    command?: string;
  }

  /**
   * Result object returned by fpcalc
   */
  interface FpcalcResult {
    /**
     * Path to the audio file
     */
    file: string;
    
    /**
     * Duration of the audio file in seconds
     */
    duration: number;
    
    /**
     * Audio fingerprint (string if raw=false, Buffer if raw=true)
     */
    fingerprint: string | Buffer;
  }

  /**
   * Callback function signature
   */
  type FpcalcCallback = (error: Error | null, result: FpcalcResult) => void;

  /**
   * Calculate audio fingerprint using fpcalc
   * 
   * @param file - Path to audio file or readable stream
   * @param callback - Callback function
   */
  function fpcalc(file: string, callback: FpcalcCallback): void;

  /**
   * Calculate audio fingerprint using fpcalc with options
   * 
   * @param file - Path to audio file or readable stream
   * @param options - Fpcalc options
   * @param callback - Callback function
   */
  function fpcalc(
    file: string,
    options: FpcalcOptions,
    callback: FpcalcCallback
  ): void;

  export = fpcalc;
}
