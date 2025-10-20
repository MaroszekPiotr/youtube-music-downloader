// src/domain/value-objects/Fingerprint.ts

import { Result } from '@shared/types/Result.js';

/**
 * Fingerprint Value Object
 * Represents immutable audio fingerprint from Chromaprint
 */
export class Fingerprint {
  private static readonly MIN_LENGTH = 100;

  private constructor(
    private readonly value: string,
    private readonly duration: number
  ) {
    this.validate();
  }

  /**
   * Creates Fingerprint from raw data
   */
  public static create(
    value: string,
    duration: number
  ): Result<Fingerprint, Error> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new Error('Fingerprint value cannot be empty'));
    }

    if (value.length < Fingerprint.MIN_LENGTH) {
      return Result.fail(
        new Error(`Fingerprint too short: ${value.length} < ${Fingerprint.MIN_LENGTH}`)
      );
    }

    if (duration <= 0) {
      return Result.fail(new Error('Duration must be positive'));
    }

    return Result.ok(new Fingerprint(value, duration));
  }

  /**
   * Validates fingerprint data
   */
  private validate(): void {
    if (this.value.length < Fingerprint.MIN_LENGTH) {
      throw new Error('Invalid fingerprint length');
    }
    if (this.duration <= 0) {
      throw new Error('Invalid duration');
    }
  }

  /**
   * Gets raw fingerprint value
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Gets audio duration in seconds
   */
  public getDuration(): number {
    return this.duration;
  }

  /**
   * Compares with another fingerprint
   */
  public equals(other: Fingerprint): boolean {
    return this.value === other.value;
  }

  /**
   * Calculates similarity ratio (0.0 - 1.0)
   * Simple implementation - can be extended with fuzzy matching
   */
  public similarity(other: Fingerprint): number {
    if (this.equals(other)) {
      return 1.0;
    }

    // For now, binary comparison
    // TODO: Implement fuzzy matching algorithm (Hamming distance)
    return 0.0;
  }

  /**
   * String representation
   */
  public toString(): string {
    return `Fingerprint(length=${this.value.length}, duration=${this.duration}s)`;
  }
}
