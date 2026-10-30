import { randomUUID } from "expo-crypto";
import { createContext, useContext, useState, type ReactNode } from "react";

import { mockCategories, mockCredentials } from "@/data/mock-vault";
import type { Category, Credential } from "@/types/vault";

import {
  createInMemoryVaultRepository,
  type CreateCategoryResult,
  type RenameCategoryResult,
} from "./vault-repository";

// What every screen inside <VaultProvider> can read and call.
type VaultContextValue = {
  categories: Category[];
  credentials: Credential[];
  createCategory: (name: string, parentId: string | null) => CreateCategoryResult;
  renameCategory: (id: string, name: string) => RenameCategoryResult;
};

const VaultContext = createContext<VaultContextValue | null>(null);

// Owns the vault data for the whole app and shares it with every screen below it.
export function VaultProvider({ children }: { children: ReactNode }) {
  // Passing a function to useState runs it only once, so the repository is created once.
  const [repository] = useState(() =>
    createInMemoryVaultRepository(
      { categories: mockCategories, credentials: mockCredentials },
      randomUUID,
    ),
  );

  // A copy of the repository's data in React state. Updating it makes the screens re-render.
  const [categories, setCategories] = useState(() => repository.getCategories());
  const [credentials] = useState(() => repository.getCredentials());

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

  return (
    <VaultContext value={{ categories, credentials, createCategory, renameCategory }}>
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
