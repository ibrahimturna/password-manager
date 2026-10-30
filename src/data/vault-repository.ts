import { addCategory, renameCategory } from "@/features/categories/category-mutations";
import type { Category, Credential } from "@/types/vault";

// The only way the app reads or changes vault data.
// Screens depend on this type, not on where the data is stored, so the in-memory
// version below can be replaced by a SQLite version in Milestone 6.
export type VaultRepository = {
  getCategories(): Category[];
  getCredentials(): Credential[];
  // Returns the new category, so the caller knows its id.
  createCategory(name: string, parentId: string | null): Category;
  renameCategory(id: string, name: string): void;
};

type VaultSeed = {
  categories: Category[];
  credentials: Credential[];
};

// Keeps the vault in memory, starting from `seed`. Everything is lost when the app restarts.
// `generateId` makes ids for new items. The app passes a UUID generator; tests pass a predictable one.
export function createInMemoryVaultRepository(
  seed: VaultSeed,
  generateId: () => string,
): VaultRepository {
  // Only the functions below can see or replace these arrays.
  let categories = seed.categories;
  const credentials = seed.credentials;

  return {
    getCategories: () => categories,
    getCredentials: () => credentials,
    createCategory(name, parentId) {
      const category: Category = { id: generateId(), name, parentId };
      categories = addCategory(categories, category.id, category.name, category.parentId);
      return category;
    },
    renameCategory(id, name) {
      categories = renameCategory(categories, id, name);
    },
  };
}
