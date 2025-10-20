export const TYPES = {
  // Ports
  Fingerprinter: Symbol.for('IFingerprinter'),
  Logger: Symbol.for('ILogger'),
  TrackRepository: Symbol.for('ITrackRepository'),  // <-- To musi być TrackRepository
  
  // Use Cases
  GenerateFingerprintUseCase: Symbol.for('GenerateFingerprintUseCase'),
  
  // Config
  Config: Symbol.for('Config'),
} as const;