// src/infrastructure/external/YtDlpSampleDownloader.ts

import fs from 'fs/promises';
import path from 'path';
import type {
  ISampleDownloader,
  SampleDownloadOptions,
  SampleFileInfo,
} from '@application/ports/ISampleDownloader.js';
import type { ILogger } from '@application/ports/ILogger.js';
import { Result } from '@shared/types/Result.js';
import { injectable, inject } from 'inversify';
import { TYPES } from '@shared/di/types.js';
import ytdl from '@distube/ytdl-core';

/**
 * YouTube sample downloader using yt-dlp
 * Infrastructure layer adapter implementing ISampleDownloader port
 */
@injectable()
export class YtDlpSampleDownloader implements ISampleDownloader {
  private readonly tempDir: string;

  private static readonly DEFAULT_DURATION = 60;
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly MIN_FILE_SIZE = 500000; // 500KB

  constructor(
    @inject(TYPES.Logger) private readonly logger: ILogger,
    tempDir: string = './temp'
  ) {
    this.tempDir = tempDir;
  }

  /**
   * Initializes temp directory
   */
  public async initialize(): Promise<Result<void, Error>> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      this.logger.debug('Sample downloader temp directory initialized', {
        path: this.tempDir,
      });
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to create temp directory', error as Error);
      return Result.fail(
        error instanceof Error ? error : new Error('Directory creation failed')
      );
    }
  }

  /**
   * Downloads audio sample from YouTube video
   */
  public async downloadSample(
    videoId: string,
    options: SampleDownloadOptions = {}
  ): Promise<Result<SampleFileInfo, Error>> {
    const duration = options.duration ?? YtDlpSampleDownloader.DEFAULT_DURATION;
    const retries = options.retries ?? YtDlpSampleDownloader.DEFAULT_RETRIES;
    const startOffset = options.startOffset ?? 0;

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const outputPath = path.join(this.tempDir, `${videoId}_sample.mp3`);

    this.logger.info(`Downloading sample: ${videoId}`, { duration, retries });

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= retries; attempt++) {
      const downloadResult = await this.attemptDownload(
        videoUrl,
        outputPath,
        duration,
        startOffset,
        attempt
      );

      if (downloadResult.isSuccess()) {
        return downloadResult;
      }

      if (attempt === retries) {
        this.logger.error(
          `Failed to download sample after ${retries} attempts`,
          downloadResult.getError()
        );
        return Result.fail(
          new Error(`Download failed after ${retries} attempts: ${downloadResult.getError().message}`)
        );
      }

      // Exponential backoff
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      this.logger.warn(
  `Attempt ${attempt}/${retries} failed, retrying in ${delayMs}ms: ${downloadResult.getError().message}`,
  { videoId }
);
      await this.sleep(delayMs);
    }

    return Result.fail(new Error('Download failed unexpectedly'));
  }

  /**
   * Single download attempt
   */
  private async attemptDownload(
    videoUrl: string,
    outputPath: string,
    duration: number,
    startOffset: number,
    attempt: number
  ): Promise<Result<SampleFileInfo, Error>> {
    try {
      this.logger.debug(`Download attempt ${attempt}`, {
        url: videoUrl,
        duration,
        startOffset,
      });

      // Use ytdl-core for downloading
      const videoInfo = await ytdl.getInfo(videoUrl);
      const audioFormat = ytdl.chooseFormat(videoInfo.formats, {
        quality: 'highestaudio',
        filter: 'audioonly',
      });

      if (!audioFormat) {
        return Result.fail(new Error('No audio format available'));
      }

      // Download sample using stream
      const writeStream = (await import('fs')).createWriteStream(outputPath);
      const audioStream = ytdl(videoUrl, {
        format: audioFormat,
        range: { start: startOffset, end: startOffset + duration },
      });

      await new Promise<void>((resolve, reject) => {
        audioStream.pipe(writeStream);
        audioStream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
      });

      // Verify file
      const stats = await fs.stat(outputPath);

      if (stats.size < YtDlpSampleDownloader.MIN_FILE_SIZE) {
        await this.cleanup(outputPath);
        return Result.fail(
          new Error(`Downloaded file too small: ${stats.size} bytes`)
        );
      }

      const sampleInfo: SampleFileInfo = {
        filePath: outputPath,
        videoId: this.extractVideoId(videoUrl),
        size: stats.size,
        duration,
      };

      this.logger.info('Sample downloaded successfully', {
        videoId: sampleInfo.videoId,
        size: stats.size,
      });

      return Result.ok(sampleInfo);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
     this.logger.warn(`Download attempt failed: ${(error as Error).message}`, {
  attempt,
});
      return Result.fail(new Error(`Download failed: ${errorMessage}`));
    }
  }

  /**
   * Cleans up specific sample file
   */
  public async cleanup(filePath: string): Promise<Result<void, Error>> {
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      this.logger.info('Sample file cleaned up', {
        file: path.basename(filePath),
      });
      return Result.ok(undefined);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - that's ok
        return Result.ok(undefined);
      }
      this.logger.warn(`Failed to cleanup file: ${(error as Error).message}`, {
  filePath,
});
      return Result.fail(
        error instanceof Error ? error : new Error('Cleanup failed')
      );
    }
  }

  /**
   * Cleans up all sample files in temp directory
   */
  public async cleanupAll(): Promise<Result<number, Error>> {
    try {
      const files = await fs.readdir(this.tempDir);
      let cleanedCount = 0;

      for (const file of files) {
        if (file.endsWith('_sample.mp3')) {
          const filePath = path.join(this.tempDir, file);
          const result = await this.cleanup(filePath);
          if (result.isSuccess()) {
            cleanedCount++;
          }
        }
      }

      this.logger.info(`Cleaned up temp directory`, {
        filesRemoved: cleanedCount,
      });

      return Result.ok(cleanedCount);
    } catch (error) {
      this.logger.error('Failed to cleanup all files', error as Error);
      return Result.fail(
        error instanceof Error ? error : new Error('Cleanup all failed')
      );
    }
  }

  /**
   * Extracts video ID from YouTube URL
   */
  private extractVideoId(url: string): string {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : '';
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
