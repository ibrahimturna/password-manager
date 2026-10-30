import { randomUUID } from "expo-crypto";
import { createContext, useContext, useState, type ReactNode } from "react";

import { mockCategories, mockCredentials } from "@/data/mock-vault";
import type { CategoryDeletion } from "@/features/categories/category-mutations";
import type { CredentialInput } from "@/features/credentials/credential-validation";
import type { Category, Credential } from "@/types/vault";

import {
  createInMemoryVaultRepository,
  type CreateCategoryResult,
  type CredentialDeletion,
  type RenameCategoryResult,
  type SaveCredentialResult,
} from "./vault-repository";

// What every screen inside <VaultProvider> can read and call.
type VaultContextValue = {
  categories: Category[];
  credentials: Credential[];
  createCategory: (name: string, parentId: string | null) => CreateCategoryResult;
  renameCategory: (id: string, name: string) => RenameCategoryResult;
  deleteCategory: (id: string) => CategoryDeletion;
  restoreDeletion: (deletion: CategoryDeletion) => void;
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
      { categories: mockCategories, credentials: mockCredentials },
      randomUUID,
      Date.now,
    ),
  );

  // A copy of the repository's data in React state. Updating it makes the screens re-render.
  const [categories, setCategories] = useState(() => repository.getCategories());
  const [credentials, setCredentials] = useState(() => repository.getCredentials());

  // Both functions return the repository's result, so the screen can show a validation error.
  // A rejected name changes nothing, but setCategories then gets the same array and React skips the re-render.
  function createCategory(name: string, parentId: string | null): CreateCategoryResult {
    const result = repository.createCategory(name, parentId);
    setCategories(repository.getCategories());
    return result;
  }

  function renameCategory(id: string, name: string): RenameCategoryResult {
    const result = repository.renameCategory(id, name);
    setCategories(repository.getCategories());
    return result;
  }

  // Deleting and restoring change credentials too, so both copies are refreshed.
  function deleteCategory(id: string): CategoryDeletion {
    const deletion = repository.deleteCategory(id);
    setCategories(repository.getCategories());
    setCredentials(repository.getCredentials());
    return deletion;
  }

  function restoreDeletion(deletion: CategoryDeletion) {
    repository.restoreDeletion(deletion);
    setCategories(repository.getCategories());
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
        categories,
        credentials,
        createCategory,
        renameCategory,
        deleteCategory,
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
