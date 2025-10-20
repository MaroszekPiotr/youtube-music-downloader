// src/infrastructure/persistence/JsonTrackRepository.ts

import fs from 'fs/promises';
import type { ITrackRepository } from '@domain/repositories/ITrackRepository.js';
import type { ILogger } from '@application/ports/ILogger.js';
import { Track, type TrackData } from '@domain/entities/Track.js';
import { Result } from '@shared/types/Result.js';
import { injectable, inject } from 'inversify';
import { TYPES } from '@shared/di/types.js';

/**
 * Database file structure
 */
interface DatabaseStructure {
  version: string;
  lastModified: string;
  tracks: Record<string, TrackData>;
}

/**
 * JSON file-based Track Repository
 * Infrastructure layer implementation of ITrackRepository
 */
@injectable()
export class JsonTrackRepository implements ITrackRepository {
  private readonly dataPath: string;
  private readonly backupPath: string;
  private cache: Map<string, Track>;

  constructor(
    @inject(TYPES.Logger) private readonly logger: ILogger,
    dataPath: string = './data/tracks.json'
  ) {
    this.dataPath = dataPath;
    this.backupPath = `${dataPath}.backup`;
    this.cache = new Map();
  }

  /**
   * Initializes repository (loads data from file)
   */
  public async initialize(): Promise<Result<void, Error>> {
    this.logger.info('Initializing JsonTrackRepository', { path: this.dataPath });

    const loadResult = await this.load();
    if (loadResult.isFailure()) {
      this.logger.error('Failed to load tracks', loadResult.getError());
      return loadResult;
    }

    this.logger.info('Repository initialized successfully', {
      trackCount: this.cache.size,
    });

    return Result.ok(undefined);
  }

  /**
   * Saves a track to repository
   */
  public async save(track: Track): Promise<Result<void, Error>> {
    // Check if track already exists
    const existsResult = await this.exists(track.videoId);
    if (existsResult.isFailure()) {
      return Result.fail(existsResult.getError());
    }

    if (existsResult.getValue()) {
      return Result.fail(
        new Error(`Track with videoId ${track.videoId} already exists`)
      );
    }

    // Create track with timestamp
    const trackData: TrackData = {
  ...track.toData(),
  addedAt: new Date().toISOString(),
  updatedAt: undefined,
};

const trackWithTimestampResult = Track.create(trackData);
    if (trackWithTimestampResult.isFailure()) {
      return Result.fail(trackWithTimestampResult.getError());
    }

    const trackWithTimestamp = trackWithTimestampResult.getValue();

    // Add to cache
    this.cache.set(track.videoId, trackWithTimestamp);

    // Persist to file
    const persistResult = await this.persist();
    if (persistResult.isFailure()) {
      // Rollback cache
      this.cache.delete(track.videoId);
      return persistResult;
    }

    this.logger.info(`Track saved: ${track.title}`, {
      videoId: track.videoId,
    });

    return Result.ok(undefined);
  }

  /**
   * Finds track by video ID
   */
  public async findByVideoId(videoId: string): Promise<Result<Track | null, Error>> {
    try {
      const track = this.cache.get(videoId) || null;
      this.logger.debug(`Find by videoId: ${videoId}`, { found: !!track });
      return Result.ok(track);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error('Find failed')
      );
    }
  }

  /**
   * Finds track by fingerprint
   */
  public async findByFingerprint(
    fingerprint: string
  ): Promise<Result<Track | null, Error>> {
    try {
      for (const track of this.cache.values()) {
        if (track.fingerprint === fingerprint) {
          this.logger.debug(`Found track by fingerprint`, {
            videoId: track.videoId,
          });
          return Result.ok(track);
        }
      }
      return Result.ok(null);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error('Find failed')
      );
    }
  }

  /**
   * Finds track by checksum
   */
  public async findByChecksum(checksum: string): Promise<Result<Track | null, Error>> {
    try {
      for (const track of this.cache.values()) {
        if (track.checksum === checksum) {
          this.logger.debug(`Found track by checksum`, {
            videoId: track.videoId,
          });
          return Result.ok(track);
        }
      }
      return Result.ok(null);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error('Find failed')
      );
    }
  }

  /**
   * Gets all tracks
   */
  public async findAll(): Promise<Result<Track[], Error>> {
    try {
      const tracks = Array.from(this.cache.values());
      this.logger.debug(`Find all tracks`, { count: tracks.length });
      return Result.ok(tracks);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error('Find all failed')
      );
    }
  }

  /**
   * Gets tracks by playlist name
   */
  public async findByPlaylist(
    playlistName: string
  ): Promise<Result<Track[], Error>> {
    try {
      const tracks = Array.from(this.cache.values()).filter((track) =>
        track.playlists.includes(playlistName)
      );
      this.logger.debug(`Find by playlist: ${playlistName}`, {
        count: tracks.length,
      });
      return Result.ok(tracks);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error('Find by playlist failed')
      );
    }
  }

  /**
   * Updates existing track
   */
  public async update(videoId: string, track: Track): Promise<Result<void, Error>> {
    const existsResult = await this.exists(videoId);
    if (existsResult.isFailure()) {
      return Result.fail(existsResult.getError());
    }

    if (!existsResult.getValue()) {
      return Result.fail(new Error(`Track with videoId ${videoId} not found`));
    }

    // Create updated track with new timestamp
    const updatedTrackData: TrackData = {
      ...track.toData(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTrackResult = Track.create(updatedTrackData);
    if (updatedTrackResult.isFailure()) {
      return Result.fail(updatedTrackResult.getError());
    }

    this.cache.set(videoId, updatedTrackResult.getValue());

    const persistResult = await this.persist();
    if (persistResult.isFailure()) {
      return persistResult;
    }

    this.logger.info(`Track updated: ${track.title}`, { videoId });
    return Result.ok(undefined);
  }

  /**
   * Removes track from repository
   */
  public async remove(videoId: string): Promise<Result<void, Error>> {
    const trackResult = await this.findByVideoId(videoId);
    if (trackResult.isFailure()) {
      return Result.fail(trackResult.getError());
    }

    const track = trackResult.getValue();
    if (!track) {
      return Result.fail(new Error(`Track with videoId ${videoId} not found`));
    }

    this.cache.delete(videoId);

    const persistResult = await this.persist();
    if (persistResult.isFailure()) {
      // Rollback
      this.cache.set(videoId, track);
      return persistResult;
    }

    this.logger.info(`Track removed: ${track.title}`, { videoId });
    return Result.ok(undefined);
  }

  /**
   * Checks if track exists
   */
  public async exists(videoId: string): Promise<Result<boolean, Error>> {
    try {
      return Result.ok(this.cache.has(videoId));
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error('Exists check failed')
      );
    }
  }

  /**
   * Loads data from JSON file
   */
  private async load(): Promise<Result<void, Error>> {
    try {
      // Check if file exists
      try {
        await fs.access(this.dataPath);
      } catch {
        // File doesn't exist - create empty database
        this.logger.info('Database file not found, creating new one');
        return await this.persist();
      }

      // Read file
      const rawData = await fs.readFile(this.dataPath, 'utf-8');
      const db: DatabaseStructure = JSON.parse(rawData);

      // Validate structure
      if (!db.tracks || typeof db.tracks !== 'object') {
        this.logger.warn('Invalid database structure, attempting backup recovery');
        return await this.loadBackup();
      }

      // Load tracks into cache
      this.cache.clear();
      for (const [videoId, trackData] of Object.entries(db.tracks)) {
        const trackResult = Track.create(trackData);
        if (trackResult.isSuccess()) {
          this.cache.set(videoId, trackResult.getValue());
        } else {
          this.logger.warn(`Skipped invalid track: ${videoId}`, {
            error: trackResult.getError().message,
          });
        }
      }

      this.logger.info(`Loaded ${this.cache.size} tracks from database`);
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to load database', error as Error);
      // Attempt backup recovery
      return await this.loadBackup();
    }
  }

  /**
   * Persists data to JSON file with atomic write and backup
   */
  private async persist(): Promise<Result<void, Error>> {
    try {
      // Create backup of existing file
      try {
        await fs.access(this.dataPath);
        await fs.copyFile(this.dataPath, this.backupPath);
        this.logger.debug('Created backup');
      } catch {
        // No existing file to backup
      }

      // Prepare database structure
      const db: DatabaseStructure = {
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        tracks: {},
      };

      // Convert cache to plain objects
      for (const [videoId, track] of this.cache.entries()) {
        db.tracks[videoId] = track.toData();
      }

      // Write to temporary file first (atomic write)
      const tempPath = `${this.dataPath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(db, null, 2), 'utf-8');

      // Rename temp to actual (atomic operation)
      await fs.rename(tempPath, this.dataPath);

      this.logger.debug('Database persisted successfully');
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to persist database', error as Error);
      return Result.fail(
        error instanceof Error ? error : new Error('Persist failed')
      );
    }
  }

  /**
   * Loads backup file
   */
  private async loadBackup(): Promise<Result<void, Error>> {
    try {
      await fs.access(this.backupPath);
      const rawData = await fs.readFile(this.backupPath, 'utf-8');
      const db: DatabaseStructure = JSON.parse(rawData);

      this.cache.clear();
      for (const [videoId, trackData] of Object.entries(db.tracks)) {
        const trackResult = Track.create(trackData);
        if (trackResult.isSuccess()) {
          this.cache.set(videoId, trackResult.getValue());
        }
      }

      this.logger.warn('Recovered database from backup', {
        trackCount: this.cache.size,
      });

      // Save recovered data to main file
      await this.persist();

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Backup recovery failed', error as Error);
      // Create empty database as last resort
      this.cache.clear();
      return await this.persist();
    }
  }
}
