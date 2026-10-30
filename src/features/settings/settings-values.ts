// Returns `stored` if it is one of the `allowed` values, otherwise `fallback`.
// Saved values are checked because they come from outside the code (e.g. an older app version).
export function parseSetting<T extends string>(
  stored: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  const match = allowed.find((value) => value === stored);
  return match ?? fallback;
}
