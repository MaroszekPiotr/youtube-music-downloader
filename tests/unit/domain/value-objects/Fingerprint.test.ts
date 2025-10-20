// tests/unit/domain/value-objects/Fingerprint.test.ts

import { describe, it, expect } from '@jest/globals';
import { Fingerprint } from '@domain/value-objects/Fingerprint.js';

describe('Fingerprint Value Object', () => {
  const validValue = 'A'.repeat(150); // Long enough fingerprint
  const validDuration = 120.5;

  describe('create', () => {
    it('should create valid fingerprint', () => {
      const result = Fingerprint.create(validValue, validDuration);

      expect(result.isSuccess()).toBe(true);
      const fingerprint = result.getValue();
      expect(fingerprint.getValue()).toBe(validValue);
      expect(fingerprint.getDuration()).toBe(validDuration);
    });

    it('should fail for empty value', () => {
      const result = Fingerprint.create('', validDuration);

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toContain('cannot be empty');
    });

    it('should fail for too short fingerprint', () => {
      const shortValue = 'ABC';
      const result = Fingerprint.create(shortValue, validDuration);

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toContain('too short');
    });

    it('should fail for zero duration', () => {
      const result = Fingerprint.create(validValue, 0);

      expect(result.isFailure()).toBe(true);
      expect(result.getError().message).toContain('must be positive');
    });

    it('should fail for negative duration', () => {
      const result = Fingerprint.create(validValue, -10);

      expect(result.isFailure()).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for identical fingerprints', () => {
      const fp1 = Fingerprint.create(validValue, validDuration).getValue();
      const fp2 = Fingerprint.create(validValue, validDuration).getValue();

      expect(fp1.equals(fp2)).toBe(true);
    });

    it('should return false for different fingerprints', () => {
      const fp1 = Fingerprint.create(validValue, validDuration).getValue();
      const fp2 = Fingerprint.create('B'.repeat(150), validDuration).getValue();

      expect(fp1.equals(fp2)).toBe(false);
    });
  });

  describe('similarity', () => {
    it('should return 1.0 for identical fingerprints', () => {
      const fp1 = Fingerprint.create(validValue, validDuration).getValue();
      const fp2 = Fingerprint.create(validValue, validDuration).getValue();

      expect(fp1.similarity(fp2)).toBe(1.0);
    });

    it('should return 0.0 for different fingerprints', () => {
      const fp1 = Fingerprint.create(validValue, validDuration).getValue();
      const fp2 = Fingerprint.create('B'.repeat(150), validDuration).getValue();

      expect(fp1.similarity(fp2)).toBe(0.0);
    });
  });
});
