import { IdempotencyKeyGenerator } from './idempotency-key-generator';

describe('IdempotencyKeyGenerator', () => {
  it('produces a different key of 8 to 128 characters on every call', () => {
    const generator = new IdempotencyKeyGenerator();
    const keys = [generator.next(), generator.next(), generator.next()];
    expect(new Set(keys).size).toBe(3);
    for (const key of keys) {
      expect(key.length).toBeGreaterThanOrEqual(8);
      expect(key.length).toBeLessThanOrEqual(128);
    }
  });
});
