import type { Category, Credential } from "@/types/vault";

// Returns the categories whose parent is `parentId`.
// parentId === null means "top-level categories".
export function getChildCategories(
  categories: Category[],
  parentId: string | null,
): Category[] {
  return categories.filter((category) => category.parentId === parentId);
}

// Returns the category with the given id, or undefined if there is none.
export function getCategoryById(
  categories: Category[],
  id: string,
): Category | undefined {
  return categories.find((category) => category.id === id);
}

// Returns the credentials stored directly in a category (not in its subcategories).
export function getCredentialsInCategory(
  credentials: Credential[],
  categoryId: string,
): Credential[] {
  return credentials.filter((credential) => credential.categoryId === categoryId);
}
