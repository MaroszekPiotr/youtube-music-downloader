// tests/unit/infrastructure/external/YtDlpSampleDownloader.test.ts

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { YtDlpSampleDownloader } from '@infrastructure/external/YtDlpSampleDownloader.js';
import type { ILogger } from '@application/ports/ILogger.js';
import fs from 'fs/promises';
import path from 'path';

describe('YtDlpSampleDownloader', () => {
  let downloader: YtDlpSampleDownloader;
  let mockLogger: jest.Mocked<ILogger>;
  const testTempDir = './test/temp';

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
    } as jest.Mocked<ILogger>;

    downloader = new YtDlpSampleDownloader(mockLogger, testTempDir);
    await downloader.initialize();
  });

  afterEach(async () => {
    // Cleanup
    await downloader.cleanupAll();
    try {
      await fs.rmdir(testTempDir);
    } catch {}
  });

  describe('downloadSample', () => {
    it('should fail gracefully with invalid video ID', async () => {
      const result = await downloader.downloadSample('invalid_id', {
        duration: 5,
        retries: 1,
      });

      expect(result.isFailure()).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      const result = await downloader.downloadSample('test_id', {
        duration: 5,
        retries: 2,
      });

      // Will fail but should attempt 2 times
      expect(result.isFailure()).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup specific file', async () => {
      const testFile = path.join(testTempDir, 'test_sample.mp3');
      await fs.writeFile(testFile, 'test data');

      const result = await downloader.cleanup(testFile);

      expect(result.isSuccess()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('cleaned up'),
        expect.any(Object)
      );
    });

    it('should handle non-existent file gracefully', async () => {
      const result = await downloader.cleanup('/nonexistent/file.mp3');

      expect(result.isSuccess()).toBe(true);
    });
  });

  describe('cleanupAll', () => {
    it('should cleanup all sample files', async () => {
      // Create test files
      await fs.writeFile(
        path.join(testTempDir, 'video1_sample.mp3'),
        'data'
      );
      await fs.writeFile(
        path.join(testTempDir, 'video2_sample.mp3'),
        'data'
      );
      await fs.writeFile(path.join(testTempDir, 'other.txt'), 'data'); // Should not be removed

      const result = await downloader.cleanupAll();

      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(2); // Only .mp3 files

      const files = await fs.readdir(testTempDir);
      expect(files).toContain('other.txt');
      expect(files).not.toContain('video1_sample.mp3');
    });
  });
});
