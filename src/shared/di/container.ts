// src/shared/di/container.ts

import { Container } from 'inversify';
import 'reflect-metadata';
import type { IFingerprinter } from '@application/ports/IFingerprinter.js';
import type { ILogger } from '@application/ports/ILogger.js';
import type { ITrackRepository } from '@domain/repositories/ITrackRepository.js';
import { FpcalcFingerprinter } from '@infrastructure/external/FpcalcFingerprinter.js';
import { ConsoleLogger } from '@infrastructure/adapters/ConsoleLogger.js';
import { JsonTrackRepository } from '@infrastructure/persistence/JsonTrackRepository.js';
import { GenerateFingerprintUseCase } from '@application/use-cases/fingerprint/GenerateFingerprintUseCase.js';
import { TYPES } from './types.js';

/**
 * Dependency Injection Container
 */
export class DIContainer {
  private readonly container: Container;

  constructor() {
    this.container = new Container();
    this.registerDependencies();
  }

  public getContainer(): Container {
    return this.container;
  }

  private registerDependencies(): void {
    // Logger
    this.container
      .bind<ILogger>(TYPES.Logger)
      .to(ConsoleLogger)
      .inSingletonScope();

    // Infrastructure adapters
    this.container
      .bind<IFingerprinter>(TYPES.Fingerprinter)
      .to(FpcalcFingerprinter)
      .inSingletonScope();

    this.container
      .bind<ITrackRepository>(TYPES.TrackRepository)
      .to(JsonTrackRepository)
      .inSingletonScope();

    // Use cases
    this.container
      .bind<GenerateFingerprintUseCase>(TYPES.GenerateFingerprintUseCase)
      .to(GenerateFingerprintUseCase)
      .inTransientScope();
  }

  /**
   * Initializes repository (loads data)
   */
  public async initializeRepositories(): Promise<void> {
    const repository = this.container.get<JsonTrackRepository>(TYPES.TrackRepository);
    const result = await repository.initialize();
    
    if (result.isFailure()) {
      throw result.getError();
    }
  }
}

export const container = new DIContainer().getContainer();
