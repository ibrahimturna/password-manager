import { randomUUID } from "expo-crypto";
import { createContext, useContext, useState, type ReactNode } from "react";

import { mockFolders, mockCredentials } from "@/data/mock-vault";
import type { FolderDeletion } from "@/features/folders/folder-mutations";
import type { CredentialInput } from "@/features/credentials/credential-validation";
import type { Credential, Folder } from "@/types/vault";

import {
  createInMemoryVaultRepository,
  type CreateFolderResult,
  type CredentialDeletion,
  type RenameFolderResult,
  type SaveCredentialResult,
} from "./vault-repository";

// What every screen inside <VaultProvider> can read and call.
type VaultContextValue = {
  folders: Folder[];
  credentials: Credential[];
  createFolder: (name: string, parentId: string | null) => CreateFolderResult;
  renameFolder: (id: string, name: string) => RenameFolderResult;
  deleteFolder: (id: string) => FolderDeletion;
  restoreDeletion: (deletion: FolderDeletion) => void;
  createCredential: (input: CredentialInput) => SaveCredentialResult;
  updateCredential: (id: string, input: CredentialInput) => SaveCredentialResult;
  deleteCredential: (id: string) => CredentialDeletion;
  restoreCredentials: (deletion: CredentialDeletion) => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

// Owns the vault data for the whole app and shares it with every screen below it.
export function VaultProvider({ children }: { children: ReactNode }) {
  // Passing a function to useState runs it only once, so the repository is created once.
  const [repository] = useState(() =>
    createInMemoryVaultRepository(
      { folders: mockFolders, credentials: mockCredentials },
      randomUUID,
      Date.now,
    ),
  );

  // A copy of the repository's data in React state. Updating it makes the screens re-render.
  const [folders, setFolders] = useState(() => repository.getFolders());
  const [credentials, setCredentials] = useState(() => repository.getCredentials());

  // Both functions return the repository's result, so the screen can show a validation error.
  // A rejected name changes nothing, but setFolders then gets the same array and React skips the re-render.
  function createFolder(name: string, parentId: string | null): CreateFolderResult {
    const result = repository.createFolder(name, parentId);
    setFolders(repository.getFolders());
    return result;
  }

  function renameFolder(id: string, name: string): RenameFolderResult {
    const result = repository.renameFolder(id, name);
    setFolders(repository.getFolders());
    return result;
  }

  // Deleting and restoring change credentials too, so both copies are refreshed.
  function deleteFolder(id: string): FolderDeletion {
    const deletion = repository.deleteFolder(id);
    setFolders(repository.getFolders());
    setCredentials(repository.getCredentials());
    return deletion;
  }

  function restoreDeletion(deletion: FolderDeletion) {
    repository.restoreDeletion(deletion);
    setFolders(repository.getFolders());
    setCredentials(repository.getCredentials());
  }

  // Credential changes only touch credentials, so only that copy is refreshed.
  function createCredential(input: CredentialInput): SaveCredentialResult {
    const result = repository.createCredential(input);
    setCredentials(repository.getCredentials());
    return result;
  }

  function updateCredential(id: string, input: CredentialInput): SaveCredentialResult {
    const result = repository.updateCredential(id, input);
    setCredentials(repository.getCredentials());
    return result;
  }

  function deleteCredential(id: string): CredentialDeletion {
    const deletion = repository.deleteCredential(id);
    setCredentials(repository.getCredentials());
    return deletion;
  }

  function restoreCredentials(deletion: CredentialDeletion) {
    repository.restoreCredentials(deletion);
    setCredentials(repository.getCredentials());
  }

  return (
    <VaultContext
      value={{
        folders,
        credentials,
        createFolder,
        renameFolder,
        deleteFolder,
        restoreDeletion,
        createCredential,
        updateCredential,
        deleteCredential,
        restoreCredentials,
      }}
    >
      {children}
    </VaultContext>
  );
}

// Gives a screen access to the vault. Only works inside <VaultProvider>.
export function useVault(): VaultContextValue {
  const vault = useContext(VaultContext);
  if (vault === null) {
    throw new Error("useVault must be used inside <VaultProvider>.");
  }
  return vault;
}
