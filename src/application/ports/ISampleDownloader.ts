// src/application/ports/ISampleDownloader.ts

import type { Result } from '@shared/types/Result.js';

/**
 * Sample download options
 */
export interface SampleDownloadOptions {
  /**
   * Duration in seconds (default: 60)
   */
  readonly duration?: number;

  /**
   * Number of retry attempts (default: 3)
   */
  readonly retries?: number;

  /**
   * Start offset in seconds (default: 0)
   */
  readonly startOffset?: number;
}

/**
 * Sample file information
 */
export interface SampleFileInfo {
  readonly filePath: string;
  readonly videoId: string;
  readonly size: number;
  readonly duration: number;
}

/**
 * Sample Downloader port interface
 * Abstraction for downloading audio samples from YouTube
 */
export interface ISampleDownloader {
  /**
   * Downloads audio sample from YouTube video
   * 
   * @param videoId - YouTube video ID
   * @param options - Download options
   * @returns Result with sample file info or error
   */
  downloadSample(
    videoId: string,
    options?: SampleDownloadOptions
  ): Promise<Result<SampleFileInfo, Error>>;

  /**
   * Cleans up specific sample file
   * 
   * @param filePath - Path to file to clean up
   * @returns Result with void or error
   */
  cleanup(filePath: string): Promise<Result<void, Error>>;

  /**
   * Cleans up all sample files in temp directory
   * 
   * @returns Result with cleanup count or error
   */
  cleanupAll(): Promise<Result<number, Error>>;
}
