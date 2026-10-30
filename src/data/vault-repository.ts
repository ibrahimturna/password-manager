import {
  addCategory,
  type CategoryDeletion,
  deleteCategory,
  renameCategory,
  restoreDeletion,
} from "@/features/categories/category-mutations";
import { type CategoryNameError, validateCategoryName } from "@/features/categories/category-name";
import { getCategoryById } from "@/features/categories/category-tree";
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
import type { Category, Credential } from "@/types/vault";
import type { RemovedItem } from "@/utils/removed-items";

export type CreateCategoryResult =
  | { ok: true; category: Category }
  | { ok: false; error: CategoryNameError };

export type RenameCategoryResult = { ok: true } | { ok: false; error: CategoryNameError };

export type SaveCredentialResult =
  | { ok: true; credential: Credential }
  | { ok: false; errors: CredentialFieldErrors };

// What deleting one credential removed. Keep it to undo the delete with restoreCredentials.
export type CredentialDeletion = RemovedItem<Credential>[];

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

  // On success, returns the saved credential (with its id and timestamps).
  createCredential(input: CredentialInput): SaveCredentialResult;
  updateCredential(id: string, input: CredentialInput): SaveCredentialResult;
  // Returns what was removed, so the delete can be undone with restoreCredentials.
  deleteCredential(id: string): CredentialDeletion;
  restoreCredentials(deletion: CredentialDeletion): void;
};

type VaultSeed = {
  categories: Category[];
  credentials: Credential[];
};

// Keeps the vault in memory, starting from `seed`. Everything is lost when the app restarts.
// `generateId` makes ids for new items and `now` tells the current time (milliseconds).
// The app passes a UUID generator and Date.now; tests pass predictable ones.
export function createInMemoryVaultRepository(
  seed: VaultSeed,
  generateId: () => string,
  now: () => number,
): VaultRepository {
  // Only the functions below can see or replace these arrays.
  let categories = seed.categories;
  let credentials = seed.credentials;

  // A credential must belong to an existing category. The UI only offers existing ones,
  // so a missing category is a bug in the app, not a user mistake: it throws.
  function requireCategory(categoryId: string) {
    if (getCategoryById(categories, categoryId) === undefined) {
      throw new Error(`Category "${categoryId}" does not exist.`);
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

    createCredential(input) {
      requireCategory(input.categoryId);
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
      requireCategory(input.categoryId);
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

    restoreCredentials(deletion) {
      credentials = restoreCredentials(credentials, deletion);
    },
  };
}
