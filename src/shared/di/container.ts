import { Container } from 'inversify';
import 'reflect-metadata';

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
   * Will be populated in subsequent tasks
   */
  private registerDependencies(): void {
    // Dependencies will be registered here as modules are implemented
  }
}
