import { getRandomBytes } from "expo-crypto";

export const MIN_GENERATED_LENGTH = 8;
export const MAX_GENERATED_LENGTH = 64;

const GROUPS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/~",
};

export type CharacterGroup = keyof typeof GROUPS;

export type GeneratorOptions = { length: number } & Record<CharacterGroup, boolean>;

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

// Random whole number from 0 to max - 1, for max up to 256. A byte has 256 values, which only
// split evenly when max divides 256, so bytes above the last even split are thrown away.
// Otherwise the first characters of a set would come up slightly more often.
export function randomBelow(max: number, randomBytes: (count: number) => Uint8Array): number {
  const limit = 256 - (256 % max);
  for (;;) {
    const byte = randomBytes(1)[0];
    if (byte < limit) return byte % max;
  }
}

// Every chosen group appears at least once; the rest is drawn from all of them, then shuffled
// so those guaranteed characters are not always at the start. Empty when no group is chosen.
export function generatePassword(
  options: GeneratorOptions,
  randomBytes: (count: number) => Uint8Array = getRandomBytes,
): string {
  const groups = (Object.keys(GROUPS) as CharacterGroup[])
    .filter((group) => options[group])
    .map((group) => GROUPS[group]);
  if (groups.length === 0) return "";

  const pick = (set: string) => set[randomBelow(set.length, randomBytes)];
  const all = groups.join("");
  const characters = groups.map(pick);
  while (characters.length < options.length) characters.push(pick(all));

  for (let i = characters.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1, randomBytes);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }
  return characters.join("");
}
