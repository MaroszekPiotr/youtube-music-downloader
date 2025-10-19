/**
 * Track Entity - Core domain model
 * Represents a music track with all metadata
 */
export class Track {
  constructor(
    public readonly videoId: string,
    public readonly title: string,
    public readonly artist: string,
    public readonly duration: number,
    public readonly fingerprint: string,
    public readonly checksum: string,
    public readonly filename: string,
    public readonly audioQuality: number,
    public readonly playlists: readonly string[]
  ) {
    this.validate();
  }

  /**
   * Validates track data integrity
   */
  private validate(): void {
    if (!this.videoId || this.videoId.length === 0) {
      throw new Error('Track videoId cannot be empty');
    }
    if (!this.title || this.title.length === 0) {
      throw new Error('Track title cannot be empty');
    }
    if (this.duration <= 0) {
      throw new Error('Track duration must be positive');
    }
    if (this.audioQuality < 0) {
      throw new Error('Track audio quality cannot be negative');
    }
  }

  /**
   * Creates new track with updated playlists
   */
  public withPlaylists(playlists: readonly string[]): Track {
    return new Track(
      this.videoId,
      this.title,
      this.artist,
      this.duration,
      this.fingerprint,
      this.checksum,
      this.filename,
      this.audioQuality,
      playlists
    );
  }
}
