/**
 * Dependency Injection Types
 * Symbols for identifying dependencies in InversifyJS container
 */

export const TYPES = {
  IFingerprinter: Symbol.for('IFingerprinter'),
  ILogger: Symbol.for('ILogger'),
  IDatabase: Symbol.for('IDatabase'),
  IDownloader: Symbol.for('IDownloader'),
  IMetadataFetcher: Symbol.for('IMetadataFetcher'),
  IPlaylistGenerator: Symbol.for('IPlaylistGenerator'),
   // Ports
  Fingerprinter: Symbol.for('IFingerprinter'),
  Logger: Symbol.for('ILogger'),
  Repository: Symbol.for('IRepository'),
  
  // Use Cases
  GenerateFingerprintUseCase: Symbol.for('GenerateFingerprintUseCase'),
  
  // Config
  Config: Symbol.for('Config'),
} as const;

export type DITypes = typeof TYPES;
export type DIType = DITypes[keyof DITypes];