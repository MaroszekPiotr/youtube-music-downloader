describe('DIContainer', () => {
  test('should register FpcalcFingerprinter', () => {
    const container = new DIContainer();
    const fingerprinter = container.getContainer().get<IFingerprinter>(TYPES.IFingerprinter);
    expect(fingerprinter).toBeInstanceOf(FpcalcFingerprinter);
  });

  test('should return singleton instance', () => {
    const container = new DIContainer();
    const fp1 = container.getContainer().get<IFingerprinter>(TYPES.IFingerprinter);
    const fp2 = container.getContainer().get<IFingerprinter>(TYPES.IFingerprinter);
    expect(fp1).toBe(fp2); // Same instance
  });
});

// test/unit/FpcalcFingerprinter.test.ts
describe('FpcalcFingerprinter', () => {
  test('should promisify once in constructor', () => {
    const promisifySpy = jest.spyOn(util, 'promisify');
    const fingerprinter = new FpcalcFingerprinter();
    expect(promisifySpy).toHaveBeenCalledTimes(1);
  });
});
