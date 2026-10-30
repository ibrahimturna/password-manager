import type { Credential } from "@/types/vault";
import { reinsert, type RemovedItem } from "@/utils/removed-items";

import type { ValidCredential } from "./credential-validation";

// All functions below return new arrays and never change the ones they are given,
// so React can see that the data changed. Values are validated before these are called.

// Adds a new credential at the end. The caller provides the id and the time,
// so this function always gives the same result for the same input (predictable tests).
export function addCredential(
  credentials: Credential[],
  id: string,
  values: ValidCredential,
  now: number,
): Credential[] {
  return [...credentials, { id, ...values, createdAt: now, updatedAt: now }];
}

// Replaces the values of the credential with `id`. `createdAt` stays; `updatedAt` becomes `now`.
export function updateCredential(
  credentials: Credential[],
  id: string,
  values: ValidCredential,
  now: number,
): Credential[] {
  return credentials.map((credential) =>
    credential.id === id ? { ...credential, ...values, updatedAt: now } : credential,
  );
}

// Removes one credential. Returns the new array and what was removed (for Undo).
export function deleteCredential(
  credentials: Credential[],
  id: string,
): { credentials: Credential[]; removed: RemovedItem<Credential>[] } {
  const removed: RemovedItem<Credential>[] = [];
  const kept = credentials.filter((credential, index) => {
    if (credential.id !== id) return true;
    removed.push({ item: credential, index });
    return false;
  });
  return { credentials: kept, removed };
}

// Undoes a deleteCredential: puts the credential back where it was.
export function restoreCredentials(
  credentials: Credential[],
  removed: RemovedItem<Credential>[],
): Credential[] {
  return reinsert(credentials, removed);
}
