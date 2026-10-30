import type { Category } from "@/types/vault";

// Returns a new array where the category with `id` has the new name.
// Never changes `categories`, so React can see that the data changed.
// Validation (empty names, duplicates, ...) is added in a later step.
export function renameCategory(categories: Category[], id: string, name: string): Category[] {
  return categories.map((category) =>
    category.id === id ? { ...category, name } : category,
  );
}
