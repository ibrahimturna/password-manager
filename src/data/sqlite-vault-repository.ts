import type { SQLiteDatabase } from "expo-sqlite";

import { saveChanges } from "./vault-database";
import { createInMemoryVaultRepository, type VaultRepository } from "./vault-repository";
import {
  credentialFromRow,
  type CredentialRow,
  findChanges,
  folderFromRow,
  type FolderRow,
} from "./vault-rows";

// Stores the vault in the encrypted database.
// All rules and logic stay in the in-memory repository, which is loaded from the database at
// the start. After every change, only the differences are written back, so what is in memory
// and what is on disk stay the same.
export function createSqliteVaultRepository(
  db: SQLiteDatabase,
  generateId: () => string,
  now: () => number,
): VaultRepository {
  const memory = createInMemoryVaultRepository(
    {
      folders: db
        .getAllSync<FolderRow>("SELECT * FROM folders ORDER BY position")
        .map(folderFromRow),
      credentials: db
        .getAllSync<CredentialRow>("SELECT * FROM credentials ORDER BY position")
        .map(credentialFromRow),
    },
    generateId,
    now,
  );

  // Runs a change in memory, then saves whatever it changed.
  function saved<T>(change: () => T): T {
    const foldersBefore = memory.getFolders();
    const credentialsBefore = memory.getCredentials();

    const result = change();

    const folderChanges = findChanges(foldersBefore, memory.getFolders());
    const credentialChanges = findChanges(credentialsBefore, memory.getCredentials());
    saveChanges(db, folderChanges, credentialChanges);
    return result;
  }

  return {
    getFolders: () => memory.getFolders(),
    getCredentials: () => memory.getCredentials(),
    createFolder: (name, parentId) => saved(() => memory.createFolder(name, parentId)),
    renameFolder: (id, name) => saved(() => memory.renameFolder(id, name)),
    moveFolder: (parentId, from, to) => saved(() => memory.moveFolder(parentId, from, to)),
    deleteFolder: (id) => saved(() => memory.deleteFolder(id)),
    restoreDeletion: (deletion) => saved(() => memory.restoreDeletion(deletion)),
    createCredential: (input) => saved(() => memory.createCredential(input)),
    updateCredential: (id, input) => saved(() => memory.updateCredential(id, input)),
    deleteCredential: (id) => saved(() => memory.deleteCredential(id)),
    restoreCredentials: (deletion) => saved(() => memory.restoreCredentials(deletion)),
  };
}
