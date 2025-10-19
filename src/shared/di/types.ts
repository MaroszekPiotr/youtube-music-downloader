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
} as const;
