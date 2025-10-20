// src/shared/di/types.ts

export const TYPES = {
  // Ports
  Fingerprinter: Symbol.for('IFingerprinter'),
  Logger: Symbol.for('ILogger'),
  TrackRepository: Symbol.for('ITrackRepository'),
  SampleDownloader: Symbol.for('ISampleDownloader'),
  
  // Use Cases
  GenerateFingerprintUseCase: Symbol.for('GenerateFingerprintUseCase'),
  DownloadSampleUseCase: Symbol.for('DownloadSampleUseCase'),
  
  // Config
  Config: Symbol.for('Config'),
} as const;
