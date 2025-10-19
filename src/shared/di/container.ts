import { Container } from 'inversify';
import 'reflect-metadata';
import { TYPES } from './types.js';
import type { IFingerprinter } from '@application/ports/IFingerprinter.js';
import { FpcalcFingerprinter } from '@infrastructure/external/FpcalcFingerprinter.js';

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
    // Register Fingerprinter
    this.container
      .bind<IFingerprinter>(TYPES.IFingerprinter)
      .to(FpcalcFingerprinter)
      .inSingletonScope();

    // More bindings will be added in subsequent tasks
  }
}
