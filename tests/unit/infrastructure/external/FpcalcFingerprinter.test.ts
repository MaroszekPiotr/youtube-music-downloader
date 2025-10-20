// tests/unit/infrastructure/external/FpcalcFingerprinter.test.ts

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { FpcalcFingerprinter } from '@infrastructure/external/FpcalcFingerprinter.js';
import type { ILogger } from '@application/ports/ILogger.js';
import fs from 'fs/promises';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('fpcalc');

describe('FpcalcFingerprinter', () => {
  let fingerprinter: FpcalcFingerprinter;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
    } as jest.Mocked<ILogger>;

    fingerprinter = new FpcalcFingerprinter(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFingerprint', () => {
    const testFile = '/path/to/test.mp3';
    const mockFingerprint = 'A'.repeat(150);
    const mockDuration = 120.5;

    it('should generate fingerprint for valid file', async () => {
      // Mock file exists
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      // Mock fpcalc
      const fpcalcMock = jest.requireMock('fpcalc');
      fpcalcMock.default = jest.fn((file: string, opts: unknown, callback: Function) => {
        callback(null, {
          file,
          duration: mockDuration,
          fingerprint: mockFingerprint,
        });
      });

      const result = await fingerprinter.generateFingerprint(testFile);

      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe(mockFingerprint);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('generated successfully'),
        expect.any(Object)
      );
    });

    it('should fail for non-existent file', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await fingerprinter.generateFingerprint(testFile);

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toContain('not found');
    });

    it('should use cache for repeated calls with same parameters', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const fpcalcMock = jest.requireMock('fpcalc');
      let callCount = 0;
      fpcalcMock.default = jest.fn((file: string, opts: unknown, callback: Function) => {
        callCount++;
        callback(null, {
          file,
          duration: mockDuration,
          fingerprint: mockFingerprint,
        });
      });

      // First call - miss
      await fingerprinter.generateFingerprint(testFile);
      expect(callCount).toBe(1);

      // Second call - hit
      await fingerprinter.generateFingerprint(testFile);
      expect(callCount).toBe(1);

      const stats = fingerprinter.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should respect useCache option', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const fpcalcMock = jest.requireMock('fpcalc');
      let callCount = 0;
      fpcalcMock.default = jest.fn((file: string, opts: unknown, callback: Function) => {
        callCount++;
        callback(null, {
          file,
          duration: mockDuration,
          fingerprint: mockFingerprint,
        });
      });

      // First call without cache
      await fingerprinter.generateFingerprint(testFile, { useCache: false });
      expect(callCount).toBe(1);

      // Second call without cache - should call fpcalc again
      await fingerprinter.generateFingerprint(testFile, { useCache: false });
      expect(callCount).toBe(2);
    });
  });

  describe('compareSimilarity', () => {
    it('should return 1.0 for identical fingerprints', () => {
      const fp = 'A'.repeat(150);
      const similarity = fingerprinter.compareSimilarity(fp, fp);
      expect(similarity).toBe(1.0);
    });

    it('should return 0.0 for completely different fingerprints', () => {
      const fp1 = 'A'.repeat(150);
      const fp2 = 'B'.repeat(150);
      const similarity = fingerprinter.compareSimilarity(fp1, fp2);
      expect(similarity).toBe(0.0);
    });

    it('should return partial similarity for similar fingerprints', () => {
      const fp1 = 'AAAAABBBBB';
      const fp2 = 'AAAAACCCCC';
      const similarity = fingerprinter.compareSimilarity(fp1, fp2);
      expect(similarity).toBeGreaterThan(0.0);
      expect(similarity).toBeLessThan(1.0);
    });

    it('should handle empty fingerprints', () => {
      const similarity = fingerprinter.compareSimilarity('', 'test');
      expect(similarity).toBe(0.0);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear cache and reset statistics', async () => {
      const testFile = '/path/to/test.mp3';
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const fpcalcMock = jest.requireMock('fpcalc');
      fpcalcMock.default = jest.fn((file: string, opts: unknown, callback: Function) => {
        callback(null, {
          file,
          duration: 120,
          fingerprint: 'A'.repeat(150),
        });
      });

      await fingerprinter.generateFingerprint(testFile);

      let stats = fingerprinter.getCacheStats();
      expect(stats.size).toBe(1);

      fingerprinter.clearCache();

      stats = fingerprinter.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return correct statistics', async () => {
      const stats = fingerprinter.getCacheStats();
      expect(stats).toEqual({
        size: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
      });
    });
  });
});
