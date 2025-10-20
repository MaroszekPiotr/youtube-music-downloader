// tests/unit/infrastructure/persistence/JsonTrackRepository.test.ts

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JsonTrackRepository } from '@infrastructure/persistence/JsonTrackRepository.js';
import { Track } from '@domain/entities/Track.js';
import type { ILogger } from '@application/ports/ILogger.js';
import fs from 'fs/promises';
import path from 'path';

describe('JsonTrackRepository', () => {
  let repository: JsonTrackRepository;
  let mockLogger: jest.Mocked<ILogger>;
  const testDataPath = './test/data/test-tracks.json';

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
    } as jest.Mocked<ILogger>;

    repository = new JsonTrackRepository(mockLogger, testDataPath);
    await repository.initialize();
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      await fs.unlink(testDataPath);
      await fs.unlink(`${testDataPath}.backup`);
    } catch {}
  });

  describe('save', () => {
    it('should save track successfully', async () => {
      const trackResult = Track.create({
        videoId: 'testId123',
        fingerprint: 'AQAAf0mU'.repeat(20),
        checksum: 'abc123def456',
        filename: 'test.mp3',
        title: 'Test Song',
        artist: 'Test Artist',
        audioQuality: 192,
        duration: 180,
        playlists: [],
      });

      const track = trackResult.getValue();
      const result = await repository.save(track);

      expect(result.isSuccess()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('saved'),
        expect.any(Object)
      );
    });

    it('should fail when track already exists', async () => {
      const trackData = {
        videoId: 'duplicate123',
        fingerprint: 'AQAAf0mU'.repeat(20),
        checksum: 'abc123',
        filename: 'test.mp3',
        title: 'Test',
        artist: 'Artist',
        audioQuality: 192,
        duration: 180,
        playlists: [],
      };

      const track = Track.create(trackData).getValue();
      
      await repository.save(track);
      const result = await repository.save(track);

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toContain('already exists');
    });
  });

  describe('findByVideoId', () => {
    it('should find existing track', async () => {
      const track = Track.create({
        videoId: 'findTest123',
        fingerprint: 'AQAAf0mU'.repeat(20),
        checksum: 'xyz789',
        filename: 'find.mp3',
        title: 'Find Me',
        artist: 'Test',
        audioQuality: 192,
        duration: 200,
        playlists: [],
      }).getValue();

      await repository.save(track);

      const result = await repository.findByVideoId('findTest123');

      expect(result.isSuccess()).toBe(true);
      const found = result.getValue();
      expect(found).not.toBeNull();
      expect(found?.title).toBe('Find Me');
    });

    it('should return null for non-existent track', async () => {
      const result = await repository.findByVideoId('nonExistent');

      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBeNull();
    });
  });

  describe('findByFingerprint', () => {
    it('should find track by fingerprint', async () => {
      const fingerprint = 'UNIQUE_FINGERPRINT_123'.repeat(5);
      const track = Track.create({
        videoId: 'fpTest',
        fingerprint,
        checksum: 'check123',
        filename: 'fp.mp3',
        title: 'Fingerprint Test',
        artist: 'Test',
        audioQuality: 192,
        duration: 150,
        playlists: [],
      }).getValue();

      await repository.save(track);

      const result = await repository.findByFingerprint(fingerprint);

      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()?.videoId).toBe('fpTest');
    });
  });

  describe('remove', () => {
    it('should remove track successfully', async () => {
      const track = Track.create({
        videoId: 'removeTest',
        fingerprint: 'fp123'.repeat(20),
        checksum: 'check',
        filename: 'remove.mp3',
        title: 'Remove Me',
        artist: 'Test',
        audioQuality: 192,
        duration: 100,
        playlists: [],
      }).getValue();

      await repository.save(track);
      const removeResult = await repository.remove('removeTest');

      expect(removeResult.isSuccess()).toBe(true);

      const findResult = await repository.findByVideoId('removeTest');
      expect(findResult.getValue()).toBeNull();
    });

    it('should fail when track does not exist', async () => {
      const result = await repository.remove('nonExistent');

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toContain('not found');
    });
  });

  describe('persistence and backup', () => {
    it('should create backup when saving', async () => {
      const track = Track.create({
        videoId: 'backup123',
        fingerprint: 'fp'.repeat(50),
        checksum: 'check',
        filename: 'backup.mp3',
        title: 'Backup Test',
        artist: 'Test',
        audioQuality: 192,
        duration: 120,
        playlists: [],
      }).getValue();

      await repository.save(track);

      // Check backup exists
      try {
        await fs.access(`${testDataPath}.backup`);
        expect(true).toBe(true);
      } catch {
        expect(false).toBe(true); // Backup should exist
      }
    });
  });
});
