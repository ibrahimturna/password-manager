import { createContext, useContext, useState, type ReactNode } from "react";

import { mockCategories, mockCredentials } from "@/data/mock-vault";
import type { Category, Credential } from "@/types/vault";

import { createInMemoryVaultRepository } from "./vault-repository";

// What every screen inside <VaultProvider> can read and call.
type VaultContextValue = {
  categories: Category[];
  credentials: Credential[];
  renameCategory: (id: string, name: string) => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

// Owns the vault data for the whole app and shares it with every screen below it.
export function VaultProvider({ children }: { children: ReactNode }) {
  // Passing a function to useState runs it only once, so the repository is created once.
  const [repository] = useState(() =>
    createInMemoryVaultRepository({ categories: mockCategories, credentials: mockCredentials }),
  );

  // A copy of the repository's data in React state. Updating it makes the screens re-render.
  const [categories, setCategories] = useState(() => repository.getCategories());
  const [credentials] = useState(() => repository.getCredentials());

  function renameCategory(id: string, name: string) {
    repository.renameCategory(id, name);
    setCategories(repository.getCategories());
  }

  return (
    <VaultContext value={{ categories, credentials, renameCategory }}>
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
