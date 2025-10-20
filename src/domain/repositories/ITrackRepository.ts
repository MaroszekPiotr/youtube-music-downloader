// src/domain/repositories/ITrackRepository.ts

import type { Track } from '@domain/entities/Track.js';
import type { Result } from '@shared/types/Result.js';

/**
 * Track search criteria
 */
export interface TrackSearchCriteria {
  readonly videoId?: string;
  readonly fingerprint?: string;
  readonly checksum?: string;
  readonly playlist?: string;
}

/**
 * Repository port for Track persistence
 * Domain layer interface - no implementation details
 */
export interface ITrackRepository {
  /**
   * Saves a track to repository
   */
  save(track: Track): Promise<Result<void, Error>>;

  /**
   * Finds track by video ID
   */
  findByVideoId(videoId: string): Promise<Result<Track | null, Error>>;

  /**
   * Finds track by fingerprint
   */
  findByFingerprint(fingerprint: string): Promise<Result<Track | null, Error>>;

  /**
   * Finds track by checksum
   */
  findByChecksum(checksum: string): Promise<Result<Track | null, Error>>;

  /**
   * Gets all tracks
   */
  findAll(): Promise<Result<Track[], Error>>;

  /**
   * Gets tracks by playlist name
   */
  findByPlaylist(playlistName: string): Promise<Result<Track[], Error>>;

  /**
   * Updates existing track
   */
  update(videoId: string, track: Track): Promise<Result<void, Error>>;

  /**
   * Removes track from repository
   */
  remove(videoId: string): Promise<Result<void, Error>>;

  /**
   * Checks if track exists
   */
  exists(videoId: string): Promise<Result<boolean, Error>>;
}
