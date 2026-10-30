// The pure rules of the vault lock. Everything here can be tested without a phone.

// The vault key, locked with a key made from the master password.
// Everything needed to unlock it again, except the password itself.
export type WrappedKey = {
  salt: string; // hex; makes the same password give a different key for every vault
  memory: number; // Argon2 memory in KiB
  passes: number; // Argon2 rounds
  parallelism: number;
  sealed: string; // base64; the encrypted vault key with its nonce and authentication tag
};

// Reads a stored WrappedKey. Returns null if it is damaged, so it is never used half-valid.
export function parseWrappedKey(stored: string | null): WrappedKey | null {
  if (stored === null) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (typeof value !== "object" || value === null) return null;
    const { salt, memory, passes, parallelism, sealed } = value as Record<string, unknown>;
    if (
      typeof salt !== "string" ||
      typeof sealed !== "string" ||
      typeof memory !== "number" ||
      typeof passes !== "number" ||
      typeof parallelism !== "number"
    ) {
      return null;
    }
    return { salt, memory, passes, parallelism, sealed };
  } catch {
    return null;
  }
}

export type NewPasswordError = "empty" | "mismatch";

// The user may choose any password: only an empty one or a mistyped repeat is rejected.
export function checkNewPassword(password: string, repeat: string): NewPasswordError | null {
  if (password === "") return "empty";
  if (password !== repeat) return "mismatch";
  return null;
}

export const AUTO_LOCK_SETTINGS = ["immediately", "1min", "5min"] as const;
export type AutoLockSetting = (typeof AUTO_LOCK_SETTINGS)[number];

const AUTO_LOCK_MS: Record<AutoLockSetting, number> = {
  immediately: 0,
  "1min": 60_000,
  "5min": 300_000,
};

// True when the app stayed in the background long enough to lock the vault.
export function shouldLock(
  backgroundedAt: number | null,
  now: number,
  setting: AutoLockSetting,
): boolean {
  return backgroundedAt !== null && now - backgroundedAt >= AUTO_LOCK_MS[setting];
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
