// src/shared/di/container.ts

import { Container } from 'inversify';
import 'reflect-metadata';
import type { IFingerprinter } from '@application/ports/IFingerprinter.js';
import type { ILogger } from '@application/ports/ILogger.js';
import { FpcalcFingerprinter } from '@infrastructure/external/FpcalcFingerprinter.js';
import { ConsoleLogger } from '@infrastructure/adapters/ConsoleLogger.js';
import { TYPES } from './types.js';

/**
 * Dependency Injection Container
 * Manages all application dependencies with Inversion of Control
 */
export class DIContainer {
  private readonly container: Container;

  constructor() {
    this.container = new Container();
    this.registerDependencies();
  }

  /**
   * Gets container instance
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Registers all application dependencies
   */
  private registerDependencies(): void {
    // Logger (temporary implementation)
    this.container
      .bind<ILogger>(TYPES.Logger)
      .to(ConsoleLogger)
      .inSingletonScope();

    // Infrastructure adapters
    this.container
      .bind<IFingerprinter>(TYPES.Fingerprinter)
      .to(FpcalcFingerprinter)
      .inSingletonScope();

    // Use cases will be registered as they are implemented
  }
}

// Export singleton instance
export const container = new DIContainer().getContainer();
