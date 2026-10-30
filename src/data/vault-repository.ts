import {
  addCategory,
  type CategoryDeletion,
  deleteCategory,
  renameCategory,
  restoreDeletion,
} from "@/features/categories/category-mutations";
import { type CategoryNameError, validateCategoryName } from "@/features/categories/category-name";
import { getCategoryById } from "@/features/categories/category-tree";
import type { Category, Credential } from "@/types/vault";

export type CreateCategoryResult =
  | { ok: true; category: Category }
  | { ok: false; error: CategoryNameError };

export type RenameCategoryResult = { ok: true } | { ok: false; error: CategoryNameError };

// The only way the app reads or changes vault data.
// Screens depend on this type, not on where the data is stored, so the in-memory
// version below can be replaced by a SQLite version in Milestone 6.
export type VaultRepository = {
  getCategories(): Category[];
  getCredentials(): Credential[];
  // On success, returns the new category so the caller knows its id.
  createCategory(name: string, parentId: string | null): CreateCategoryResult;
  renameCategory(id: string, name: string): RenameCategoryResult;
  // Deletes the category, everything below it and their credentials.
  // Returns what was removed, so the delete can be undone with restoreDeletion.
  deleteCategory(id: string): CategoryDeletion;
  restoreDeletion(deletion: CategoryDeletion): void;
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
  let credentials = seed.credentials;

  return {
    getCategories: () => categories,
    getCredentials: () => credentials,

    createCategory(name, parentId) {
      // A missing parent is a bug in the app, not a user mistake, so it throws.
      if (parentId !== null && getCategoryById(categories, parentId) === undefined) {
        throw new Error(`Cannot create a category: parent "${parentId}" does not exist.`);
      }

      const validation = validateCategoryName(categories, name, parentId, null);
      if (!validation.ok) {
        return validation;
      }

      const category: Category = { id: generateId(), name: validation.name, parentId };
      categories = addCategory(categories, category.id, category.name, category.parentId);
      return { ok: true, category };
    },

    renameCategory(id, name) {
      const category = getCategoryById(categories, id);
      if (category === undefined) {
        throw new Error(`Cannot rename: category "${id}" does not exist.`);
      }

      const validation = validateCategoryName(categories, name, category.parentId, id);
      if (!validation.ok) {
        return validation;
      }

      categories = renameCategory(categories, id, validation.name);
      return { ok: true };
    },

    deleteCategory(id) {
      // Like a missing parent above: the UI only offers existing categories, so this is a bug.
      if (getCategoryById(categories, id) === undefined) {
        throw new Error(`Cannot delete: category "${id}" does not exist.`);
      }

      const result = deleteCategory(categories, credentials, id);
      categories = result.categories;
      credentials = result.credentials;
      return result.deletion;
    },

    restoreDeletion(deletion) {
      const result = restoreDeletion(categories, credentials, deletion);
      categories = result.categories;
      credentials = result.credentials;
    },
  };
}
