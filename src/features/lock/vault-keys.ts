import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  getRandomBytes,
} from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { argon2 } from "react-native-quick-crypto";

import {
  bytesToHex,
  hexToBytes,
  parseWrappedKey,
  type WrappedKey,
} from "./lock-rules";

// One random vault key encrypts the database. It exists in two locked copies:
// - WRAPPED_KEY_NAME: locked with a key made from the master password;
// - DEVICE_KEY_NAME (optional): kept in SecureStore, read only after the phone's own lock
//   (biometrics or PIN/pattern) succeeds. SecureStore's own authentication accepts only
//   strong biometrics on Android, so this check is done by the app.
// Changing the master password only re-locks a copy; the database is not re-encrypted.
const WRAPPED_KEY_NAME = "vault-wrapped-key";
const DEVICE_KEY_NAME = "vault-device-key";
// Before Milestone 7 the vault key was stored here without a password.
const OLD_KEY_NAME = "vault-database-key";

const VAULT_KEY_BYTES = 32;
const SALT_BYTES = 16;

// Argon2id settings. They are saved with each wrapped key, so they can be raised later.
const KDF_MEMORY_KIB = 64 * 1024;
const KDF_PASSES = 3;
const KDF_PARALLELISM = 1;

// Turns the password into a key. Deliberately slow, so guessing passwords is expensive.
// The callback form runs outside the UI thread, so the screen does not freeze.
function deriveKey(password: string, wrapped: Omit<WrappedKey, "sealed">): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    argon2(
      "argon2id",
      {
        message: password,
        nonce: hexToBytes(wrapped.salt).buffer as ArrayBuffer,
        parallelism: wrapped.parallelism,
        tagLength: VAULT_KEY_BYTES,
        memory: wrapped.memory,
        passes: wrapped.passes,
      },
      (error, result) => {
        if (error !== null) {
          reject(error);
        } else {
          resolve(new Uint8Array(result));
        }
      },
    );
  });
}

// Locks the vault key with the password and saves the locked copy.
export async function savePasswordCopy(vaultKey: string, password: string): Promise<void> {
  const settings = {
    salt: bytesToHex(getRandomBytes(SALT_BYTES)),
    memory: KDF_MEMORY_KIB,
    passes: KDF_PASSES,
    parallelism: KDF_PARALLELISM,
  };
  const passwordKey = await AESEncryptionKey.import(await deriveKey(password, settings));
  const sealed = await aesEncryptAsync(hexToBytes(vaultKey), passwordKey);
  const wrapped: WrappedKey = { ...settings, sealed: await sealed.combined("base64") };
  await SecureStore.setItemAsync(WRAPPED_KEY_NAME, JSON.stringify(wrapped));
}

// True once the master password has been set up.
export async function isVaultSetUp(): Promise<boolean> {
  return (await SecureStore.getItemAsync(WRAPPED_KEY_NAME)) !== null;
}

// Returns the vault key, or null if the password is wrong.
// AES-GCM refuses to decrypt with the wrong key, which is how a wrong password is detected.
export async function unlockWithPassword(password: string): Promise<string | null> {
  const wrapped = parseWrappedKey(await SecureStore.getItemAsync(WRAPPED_KEY_NAME));
  if (wrapped === null) {
    throw new Error("The locked vault key is missing or damaged.");
  }

  const passwordKey = await AESEncryptionKey.import(await deriveKey(password, wrapped));
  try {
    const vaultKey = await aesDecryptAsync(
      AESSealedData.fromCombined(wrapped.sealed),
      passwordKey,
    );
    return bytesToHex(vaultKey);
  } catch {
    return null;
  }
}

// The key of an existing vault from before the master password, or a new random one.
export async function getKeyForNewSetup(): Promise<{ vaultKey: string; isNew: boolean }> {
  const oldKey = await SecureStore.getItemAsync(OLD_KEY_NAME);
  if (oldKey !== null) return { vaultKey: oldKey, isNew: false };
  return { vaultKey: bytesToHex(getRandomBytes(VAULT_KEY_BYTES)), isNew: true };
}

// Removes the old key that had no password. Safe to call when it is already gone.
export async function deleteOldKey(): Promise<void> {
  await SecureStore.deleteItemAsync(OLD_KEY_NAME);
}

// True when the phone has biometrics, a PIN, a pattern or a password set.
export async function canUseDeviceLock(): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

export async function isDeviceLockOn(): Promise<boolean> {
  return (await SecureStore.getItemAsync(DEVICE_KEY_NAME)) !== null;
}

export async function turnOnDeviceLock(vaultKey: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_KEY_NAME, vaultKey);
}

export async function turnOffDeviceLock(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_KEY_NAME);
}

// Shows the phone's own lock screen (biometrics, with PIN/pattern as the fallback).
export async function verifyWithDeviceLock(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage });
  if (result.success || result.error !== "app_cancel") return result.success;

  // The library still thinks an earlier prompt is open, and refuses until that is cleared.
  await LocalAuthentication.cancelAuthenticate();
  return (await LocalAuthentication.authenticateAsync({ promptMessage })).success;
}

// Asks for the phone's lock, then returns the vault key. Null if it was cancelled or failed.
export async function unlockWithDeviceLock(promptMessage: string): Promise<string | null> {
  if (!(await verifyWithDeviceLock(promptMessage))) return null;
  return SecureStore.getItemAsync(DEVICE_KEY_NAME);
}
