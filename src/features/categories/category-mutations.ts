import type { Category, Credential } from "@/types/vault";

import { getDescendantIds } from "./category-tree";

// Returns a new array with a new category added at the end.
// The caller provides `id`, so this function always gives the same result for the same input
// (which keeps the tests predictable).
// Never changes `categories`, so React can see that the data changed.
// Names are validated by the repository before this is called.
export function addCategory(
  categories: Category[],
  id: string,
  name: string,
  parentId: string | null,
): Category[] {
  return [...categories, { id, name, parentId }];
}

// Returns a new array where the category with `id` has the new name.
// Never changes `categories`, so React can see that the data changed.
// Names are validated by the repository before this is called.
export function renameCategory(categories: Category[], id: string, name: string): Category[] {
  return categories.map((category) =>
    category.id === id ? { ...category, name } : category,
  );
}

// An item that was removed, and where it was in its array, so Undo can put it back in place.
type RemovedItem<T> = { item: T; index: number };

// Everything one delete removed. Keep it to undo the delete with restoreDeletion.
export type CategoryDeletion = {
  categories: RemovedItem<Category>[];
  credentials: RemovedItem<Credential>[];
};

type VaultItems = { categories: Category[]; credentials: Credential[] };

// Removes a category, every category below it, and all their credentials.
// Returns the new arrays plus a record of what was removed (for Undo).
// Never changes the arrays it is given.
export function deleteCategory(
  categories: Category[],
  credentials: Credential[],
  categoryId: string,
): VaultItems & { deletion: CategoryDeletion } {
  const deletedIds = new Set([categoryId, ...getDescendantIds(categories, categoryId)]);
  const deletion: CategoryDeletion = { categories: [], credentials: [] };

  const keptCategories = categories.filter((category, index) => {
    if (!deletedIds.has(category.id)) return true;
    deletion.categories.push({ item: category, index });
    return false;
  });
  const keptCredentials = credentials.filter((credential, index) => {
    if (!deletedIds.has(credential.categoryId)) return true;
    deletion.credentials.push({ item: credential, index });
    return false;
  });

  return { categories: keptCategories, credentials: keptCredentials, deletion };
}

// Puts removed items back at their old positions.
// Inserting from the lowest old position upward rebuilds the original order exactly,
// as long as nothing else changed in between.
function reinsert<T>(items: T[], removed: RemovedItem<T>[]): T[] {
  const result = [...items];
  const byPosition = [...removed].sort((a, b) => a.index - b.index);
  for (const { item, index } of byPosition) {
    result.splice(Math.min(index, result.length), 0, item);
  }
  return result;
}

// Undoes a deleteCategory. Returns new arrays and never changes the ones it is given.
export function restoreDeletion(
  categories: Category[],
  credentials: Credential[],
  deletion: CategoryDeletion,
): VaultItems {
  return {
    categories: reinsert(categories, deletion.categories),
    credentials: reinsert(credentials, deletion.credentials),
  };
}
