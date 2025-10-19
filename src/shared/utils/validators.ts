/**
 * Common validation utilities
 */
export class Validators {
  /**
   * Validates if string is not empty
   */
  public static isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Validates if number is positive
   */
  public static isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && value > 0 && !isNaN(value);
  }

  /**
   * Validates YouTube URL format
   */
  public static isYouTubeUrl(url: string): boolean {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,
      /^https?:\/\/(www\.)?youtube\.com\/playlist\?list=[a-zA-Z0-9_-]+/,
      /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}/,
    ];
    return patterns.some((pattern) => pattern.test(url));
  }
}
