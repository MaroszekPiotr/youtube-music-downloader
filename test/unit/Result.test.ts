import { Result } from '../../src/shared/types/Result.js';

describe('Result Pattern', () => {
  describe('Success cases', () => {
    test('should create successful result', () => {
      const result = Result.ok(42);
      
      expect(result.isSuccess()).toBe(true);
      expect(result.isFailure()).toBe(false);
      expect(result.getValue()).toBe(42);
    });

    test('should map successful value', () => {
      const result = Result.ok(10);
      const mapped = result.map((x) => x * 2);
      
      expect(mapped.isSuccess()).toBe(true);
      expect(mapped.getValue()).toBe(20);
    });

    test('should flatMap successful value', () => {
      const result = Result.ok(5);
      const mapped = result.flatMap((x) => Result.ok(x + 10));
      
      expect(mapped.isSuccess()).toBe(true);
      expect(mapped.getValue()).toBe(15);
    });
  });

  describe('Failure cases', () => {
    test('should create failed result', () => {
      const error = new Error('Test error');
      const result = Result.fail<number>(error);
      
      expect(result.isFailure()).toBe(true);
      expect(result.isSuccess()).toBe(false);
      expect(result.getError()).toBe(error);
    });

    test('should throw when getting value from failed result', () => {
      const result = Result.fail<number>(new Error('Failed'));
      
      expect(() => result.getValue()).toThrow('Cannot get value from failed result');
    });

    test('should preserve error in map chain', () => {
      const error = new Error('Original error');
      const result = Result.fail<number>(error);
      const mapped = result.map((x) => x * 2);
      
      expect(mapped.isFailure()).toBe(true);
      expect(mapped.getError()).toBe(error);
    });
  });
});
