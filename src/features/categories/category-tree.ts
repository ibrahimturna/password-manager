import type { Category } from "@/types/vault";

// Returns the categories whose parent is `parentId`.
// parentId === null means "top-level categories".
export function getChildCategories(
  categories: Category[],
  parentId: string | null,
): Category[] {
  return categories.filter((category) => category.parentId === parentId);
}
