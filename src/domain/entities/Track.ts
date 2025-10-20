// src/domain/entities/Track.ts
import { Result } from '@shared/types/Result.js';

/**
 * Track metadata for persistence
 */
export interface TrackData {
  readonly videoId: string;
  readonly fingerprint: string;
  readonly checksum: string;
  readonly filename: string;
  readonly title: string;
  readonly artist: string;
  readonly audioQuality: number;
  readonly duration: number;
  readonly playlists: readonly string[];
  readonly addedAt?: string;
  readonly updatedAt?: string;
}

/**
 * Track Entity - Core domain model
 * Represents a music track with all metadata
 */
export class Track {
  private constructor(
    public readonly videoId: string,
    public readonly fingerprint: string,
    public readonly checksum: string,
    public readonly filename: string,
    public readonly title: string,
    public readonly artist: string,
    public readonly audioQuality: number,
    public readonly duration: number,
    public readonly playlists: readonly string[],
    public readonly addedAt?: string,
    public readonly updatedAt?: string
  ) {
    this.validate();
  }

  /**
   * Creates Track from data
   */
  public static create(data: TrackData): Result<Track, Error> {
    try {
      const track = new Track(
        data.videoId,
        data.fingerprint,
        data.checksum,
        data.filename,
        data.title,
        data.artist,
        data.audioQuality,
        data.duration,
        data.playlists || [],
        data.addedAt,
        data.updatedAt
      );
      return Result.ok(track);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error('Failed to create Track')
      );
    }
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

    if (!this.fingerprint || this.fingerprint.length === 0) {
      throw new Error('Track fingerprint cannot be empty');
    }

    if (!this.checksum || this.checksum.length === 0) {
      throw new Error('Track checksum cannot be empty');
    }

    if (!this.filename || this.filename.length === 0) {
      throw new Error('Track filename cannot be empty');
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
      this.fingerprint,
      this.checksum,
      this.filename,
      this.title,
      this.artist,
      this.audioQuality,
      this.duration,
      playlists,
      this.addedAt,
      new Date().toISOString()
    );
  }

  /**
   * Adds playlist to track
   */
  public addToPlaylist(playlistName: string): Track {
    if (this.playlists.includes(playlistName)) {
      return this;
    }
    return this.withPlaylists([...this.playlists, playlistName]);
  }

  /**
   * Removes playlist from track
   */
  public removeFromPlaylist(playlistName: string): Track {
    return this.withPlaylists(
      this.playlists.filter((p) => p !== playlistName)
    );
  }

  /**
   * Converts to plain data object
   */
  public toData(): TrackData {
    return {
      videoId: this.videoId,
      fingerprint: this.fingerprint,
      checksum: this.checksum,
      filename: this.filename,
      title: this.title,
      artist: this.artist,
      audioQuality: this.audioQuality,
      duration: this.duration,
      playlists: this.playlists,
      addedAt: this.addedAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * String representation
   */
  public toString(): string {
    return `Track(${this.videoId}, "${this.title}" by ${this.artist})`;
  }
}
