import { DEFAULT_GENERATOR_OPTIONS, generatePassword, randomBelow } from "./password-generator";

// Tests only check the rules, so any random source will do.
const testRandom = (count: number) =>
  Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256));

describe("generatePassword", () => {
  it("makes a password of the chosen length", () => {
    expect(generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length: 32 }, testRandom)).toHaveLength(
      32,
    );
  });

  it("always includes every chosen group", () => {
    for (let run = 0; run < 200; run++) {
      const password = generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length: 8 }, testRandom);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it("uses only the chosen groups", () => {
    const password = generatePassword(
      { length: 40, uppercase: false, lowercase: false, numbers: true, symbols: false },
      testRandom,
    );
    expect(password).toMatch(/^[0-9]{40}$/);
  });

  it("returns nothing when no group is chosen", () => {
    expect(
      generatePassword(
        { length: 20, uppercase: false, lowercase: false, numbers: false, symbols: false },
        testRandom,
      ),
    ).toBe("");
  });
});

describe("randomBelow", () => {
  it("throws away bytes that would make low numbers more likely", () => {
    // For 10, the last even split ends at 250, so 255 is skipped and 3 is used.
    const bytes = [255, 3];
    expect(randomBelow(10, () => new Uint8Array([bytes.shift() ?? 0]))).toBe(3);
  });

  it("stays below the limit", () => {
    for (let run = 0; run < 500; run++) {
      const value = randomBelow(7, testRandom);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
    }
  });
});
