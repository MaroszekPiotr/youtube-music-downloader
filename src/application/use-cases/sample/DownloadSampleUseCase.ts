// src/application/use-cases/sample/DownloadSampleUseCase.ts

import type { ISampleDownloader, SampleFileInfo } from '@application/ports/ISampleDownloader.js';
import type { ILogger } from '@application/ports/ILogger.js';
import { Result } from '@shared/types/Result.js';
import { injectable, inject } from 'inversify';
import { TYPES } from '@shared/di/types.js';

/**
 * DTO for sample download request
 */
export interface DownloadSampleDTO {
  readonly videoId: string;
  readonly duration?: number;
  readonly retries?: number;
}

/**
 * Use case for downloading audio samples
 * Application layer orchestration
 */
@injectable()
export class DownloadSampleUseCase {
  constructor(
    @inject(TYPES.SampleDownloader) private readonly downloader: ISampleDownloader,
    @inject(TYPES.Logger) private readonly logger: ILogger
  ) {}

  /**
   * Executes sample download
   */
  public async execute(
    dto: DownloadSampleDTO
  ): Promise<Result<SampleFileInfo, Error>> {
    this.logger.info('Executing DownloadSampleUseCase', {
      videoId: dto.videoId,
      duration: dto.duration,
    });

    const result = await this.downloader.downloadSample(dto.videoId, {
      duration: dto.duration,
      retries: dto.retries,
    });

    if (result.isFailure()) {
      this.logger.error('Sample download failed in use case', result.getError(), {
        videoId: dto.videoId,
      });
      return result;
    }

    this.logger.info('Sample downloaded successfully in use case', {
      videoId: dto.videoId,
      size: result.getValue().size,
    });

    return result;
  }
}
