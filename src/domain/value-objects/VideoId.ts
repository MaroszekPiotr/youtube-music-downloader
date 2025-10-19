/**
 * VideoId Value Object
 * Ensures YouTube video ID validity
 */
export class VideoId {
  private static readonly YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

  private constructor(private readonly value: string) {
    this.validate();
  }

  /**
   * Creates VideoId from string
   */
  public static create(value: string): VideoId {
    return new VideoId(value);
  }

  /**
   * Validates YouTube video ID format
   */
  private validate(): void {
    if (!VideoId.YOUTUBE_ID_PATTERN.test(this.value)) {
      throw new Error(`Invalid YouTube video ID format: ${this.value}`);
    }
  }

  /**
   * Gets raw value
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Compares with another VideoId
   */
  public equals(other: VideoId): boolean {
    return this.value === other.value;
  }

  /**
   * String representation
   */
  public toString(): string {
    return this.value;
  }
}
