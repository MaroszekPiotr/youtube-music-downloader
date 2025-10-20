// src/application/use-cases/fingerprint/GenerateFingerprintUseCase.ts

import type { 
  IFingerprinter, 
  FingerprintOptions 
} from '@application/ports/IFingerprinter.js';
import type { ILogger } from '@application/ports/ILogger.js';
import { Result } from '@shared/types/Result.js';
import { injectable, inject } from 'inversify';
import { TYPES } from '@shared/di/types.js';

/**
 * DTO for fingerprint generation request
 */
export interface GenerateFingerprintDTO {
  readonly filePath: string;
  readonly options?: FingerprintOptions;
}

/**
 * Use case for generating audio fingerprints
 * Application layer orchestration
 */
@injectable()
export class GenerateFingerprintUseCase {
  constructor(
    @inject(TYPES.Fingerprinter) private readonly fingerprinter: IFingerprinter,
    @inject(TYPES.Logger) private readonly logger: ILogger
  ) {}

  /**
   * Executes fingerprint generation use case
   */
  public async execute(
    dto: GenerateFingerprintDTO
  ): Promise<Result<string, Error>> {
    this.logger.info('Executing GenerateFingerprintUseCase', {
      filePath: dto.filePath,
      options: dto.options,
    });

    // Use correct method name: generateFingerprint (not generate)
    const result = await this.fingerprinter.generateFingerprint(
      dto.filePath, 
      dto.options
    );

    if (result.isFailure()) {
      this.logger.error(
        'Fingerprint generation failed in use case',
        result.getError(),
        { filePath: dto.filePath }
      );
      return result;
    }

    this.logger.info('Fingerprint generated successfully in use case', {
      filePath: dto.filePath,
      fingerprintLength: result.getValue().length,
    });

    return result;
  }
}
