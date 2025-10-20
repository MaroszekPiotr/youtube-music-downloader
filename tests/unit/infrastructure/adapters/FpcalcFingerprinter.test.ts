// tests/unit/infrastructure/adapters/FpcalcFingerprinter.test.ts

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FpcalcFingerprinter } from '@infrastructure/adapters/FpcalcFingerprinter.js';
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

  describe('generate', () => {
    it('should generate fingerprint for valid file', async () => {
      const testFile = '/path/to/test.mp3';
      const mockFingerprint = 'A'.repeat(150);
      const mockDuration = 120.5;

      // Mock file exists
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      // Mock fpcalc
      const fpcalcMock = require('fpcalc');
      fpcalcMock.mockImplementation((_file: string, _opts: unknown, callback: Function) => {
        callback(null, {
          file: testFile,
          duration: mockDuration,
          fingerprint: mockFingerprint,
        });
      });

      const result = await fingerprinter.generate(testFile);

      expect(result.isSuccess()).toBe(true);
      const fingerprint = result.getValue();
      expect(fingerprint.getValue()).toBe(mockFingerprint);
      expect(fingerprint.getDuration()).toBe(mockDuration);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should fail for non-existent file', async () => {
      const testFile = '/path/to/nonexistent.mp3';

      // Mock file does not exist
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await fingerprinter.generate(testFile);

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toContain('not found');
    });

    it('should use cache for repeated calls', async () => {
      const testFile = '/path/to/test.mp3';
      const mockFingerprint = 'A'.repeat(150);

      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const fpcalcMock = require('fpcalc');
      let callCount = 0;
      fpcalcMock.mockImplementation((_file: string, _opts: unknown, callback: Function) => {
        callCount++;
        callback(null, {
          file: testFile,
          duration: 120,
          fingerprint: mockFingerprint,
        });
      });

      // First call
      await fingerprinter.generate(testFile);
      expect(callCount).toBe(1);

      // Second call should use cache
      await fingerprinter.generate(testFile);
      expect(callCount).toBe(1); // Not called again

      const stats = fingerprinter.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe('clearCache', () => {
    it('should clear cache and reset stats', async () => {
      const testFile = '/path/to/test.mp3';

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      const fpcalcMock = require('fpcalc');
      fpcalcMock.mockImplementation((_file: string, _opts: unknown, callback: Function) => {
        callback(null, {
          file: testFile,
          duration: 120,
          fingerprint: 'A'.repeat(150),
        });
      });

      await fingerprinter.generate(testFile);
      fingerprinter.clearCache();

      const stats = fingerprinter.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});
