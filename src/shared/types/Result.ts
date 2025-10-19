/**
 * Result Pattern for error handling without exceptions
 * Represents either success with value or failure with error
 */
export class Result<T, E = Error> {
  private constructor(
    private readonly success: boolean,
    private readonly value?: T,
    private readonly error?: E
  ) {}

  /**
   * Creates successful result
   */
  public static ok<T, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>(true, value);
  }

  /**
   * Creates failed result
   */
  public static fail<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  /**
   * Checks if result is successful
   */
  public isSuccess(): boolean {
    return this.success;
  }

  /**
   * Checks if result is failure
   */
  public isFailure(): boolean {
    return !this.success;
  }

  /**
   * Gets value if success, throws if failure
   */
  public getValue(): T {
    if (!this.success || this.value === undefined) {
      throw new Error('Cannot get value from failed result');
    }
    return this.value;
  }

  /**
   * Gets error if failure, throws if success
   */
  public getError(): E {
    if (this.success || this.error === undefined) {
      throw new Error('Cannot get error from successful result');
    }
    return this.error;
  }

  /**
   * Maps successful value to another type
   */
  public map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.isFailure()) {
      return Result.fail<U, E>(this.error as E);
    }
    return Result.ok<U, E>(fn(this.value as T));
  }

  /**
   * Chains another Result-returning operation
   */
  public flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.isFailure()) {
      return Result.fail<U, E>(this.error as E);
    }
    return fn(this.value as T);
  }
}
