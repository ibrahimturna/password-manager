import {
  addFolder,
  type FolderDeletion,
  deleteFolder,
  renameFolder,
  restoreDeletion,
} from "@/features/folders/folder-mutations";
import { type FolderNameError, validateFolderName } from "@/features/folders/folder-name";
import { getFolderById } from "@/features/folders/folder-tree";
import {
  addCredential,
  deleteCredential,
  restoreCredentials,
  updateCredential,
} from "@/features/credentials/credential-mutations";
import {
  type CredentialFieldErrors,
  type CredentialInput,
  validateCredential,
} from "@/features/credentials/credential-validation";
import type { Credential, Folder } from "@/types/vault";
import type { RemovedItem } from "@/utils/removed-items";

export type CreateFolderResult =
  | { ok: true; folder: Folder }
  | { ok: false; error: FolderNameError };

export type RenameFolderResult = { ok: true } | { ok: false; error: FolderNameError };

export type SaveCredentialResult =
  | { ok: true; credential: Credential }
  | { ok: false; errors: CredentialFieldErrors };

// What deleting one credential removed. Keep it to undo the delete with restoreCredentials.
export type CredentialDeletion = RemovedItem<Credential>[];

// The only way the app reads or changes vault data.
// Screens depend on this type, not on where the data is stored, so the in-memory
// version below can be replaced by a SQLite version in Milestone 6.
export type VaultRepository = {
  getFolders(): Folder[];
  getCredentials(): Credential[];
  // On success, returns the new folder so the caller knows its id.
  createFolder(name: string, parentId: string | null): CreateFolderResult;
  renameFolder(id: string, name: string): RenameFolderResult;
  // Deletes the folder, everything below it and their credentials.
  // Returns what was removed, so the delete can be undone with restoreDeletion.
  deleteFolder(id: string): FolderDeletion;
  restoreDeletion(deletion: FolderDeletion): void;

  // On success, returns the saved credential (with its id and timestamps).
  createCredential(input: CredentialInput): SaveCredentialResult;
  updateCredential(id: string, input: CredentialInput): SaveCredentialResult;
  // Returns what was removed, so the delete can be undone with restoreCredentials.
  deleteCredential(id: string): CredentialDeletion;
  restoreCredentials(deletion: CredentialDeletion): void;

  // Replaces the whole vault. Used by "Reset to sample data" until Milestone 7.
  replaceAll(contents: VaultContents): void;
};

export type VaultContents = {
  folders: Folder[];
  credentials: Credential[];
};

// Keeps the vault in memory, starting from `seed`. Everything is lost when the app restarts.
// `generateId` makes ids for new items and `now` tells the current time (milliseconds).
// The app passes a UUID generator and Date.now; tests pass predictable ones.
export function createInMemoryVaultRepository(
  seed: VaultContents,
  generateId: () => string,
  now: () => number,
): VaultRepository {
  // Only the functions below can see or replace these arrays.
  let folders = seed.folders;
  let credentials = seed.credentials;

  // A credential must belong to an existing folder. The UI only offers existing ones,
  // so a missing folder is a bug in the app, not a user mistake: it throws.
  function requireFolder(folderId: string) {
    if (getFolderById(folders, folderId) === undefined) {
      throw new Error(`Folder "${folderId}" does not exist.`);
    }
  }

  function requireCredential(id: string): Credential {
    const credential = credentials.find((item) => item.id === id);
    if (credential === undefined) {
      throw new Error(`Credential "${id}" does not exist.`);
    }
    return credential;
  }

  return {
    getFolders: () => folders,
    getCredentials: () => credentials,

    createFolder(name, parentId) {
      // A missing parent is a bug in the app, not a user mistake, so it throws.
      if (parentId !== null && getFolderById(folders, parentId) === undefined) {
        throw new Error(`Cannot create a folder: parent "${parentId}" does not exist.`);
      }

      const validation = validateFolderName(folders, name, parentId, null);
      if (!validation.ok) {
        return validation;
      }

      const folder: Folder = { id: generateId(), name: validation.name, parentId };
      folders = addFolder(folders, folder.id, folder.name, folder.parentId);
      return { ok: true, folder };
    },

    renameFolder(id, name) {
      const folder = getFolderById(folders, id);
      if (folder === undefined) {
        throw new Error(`Cannot rename: folder "${id}" does not exist.`);
      }

      const validation = validateFolderName(folders, name, folder.parentId, id);
      if (!validation.ok) {
        return validation;
      }

      folders = renameFolder(folders, id, validation.name);
      return { ok: true };
    },

    deleteFolder(id) {
      // Like a missing parent above: the UI only offers existing folders, so this is a bug.
      if (getFolderById(folders, id) === undefined) {
        throw new Error(`Cannot delete: folder "${id}" does not exist.`);
      }

      const result = deleteFolder(folders, credentials, id);
      folders = result.folders;
      credentials = result.credentials;
      return result.deletion;
    },

    restoreDeletion(deletion) {
      const result = restoreDeletion(folders, credentials, deletion);
      folders = result.folders;
      credentials = result.credentials;
    },

    createCredential(input) {
      requireFolder(input.folderId);
      const validation = validateCredential(input);
      if (!validation.ok) {
        return validation;
      }

      const id = generateId();
      credentials = addCredential(credentials, id, validation.value, now());
      return { ok: true, credential: requireCredential(id) };
    },

    updateCredential(id, input) {
      requireCredential(id);
      requireFolder(input.folderId);
      const validation = validateCredential(input);
      if (!validation.ok) {
        return validation;
      }

      credentials = updateCredential(credentials, id, validation.value, now());
      return { ok: true, credential: requireCredential(id) };
    },

    deleteCredential(id) {
      requireCredential(id);
      const result = deleteCredential(credentials, id);
      credentials = result.credentials;
      return result.removed;
    },

    replaceAll(contents) {
      folders = contents.folders;
      credentials = contents.credentials;
    },

    restoreCredentials(deletion) {
      credentials = restoreCredentials(credentials, deletion);
    },
  };
}
