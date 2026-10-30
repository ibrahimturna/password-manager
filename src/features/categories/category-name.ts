import type { Category } from "@/types/vault";

import { getChildCategories } from "./category-tree";

export const MAX_CATEGORY_NAME_LENGTH = 50;

// Why a name was rejected. These are codes, not sentences, so the screen can
// show them in any language.
export type CategoryNameError = "empty" | "too-long" | "duplicate";

export type CategoryNameResult =
  | { ok: true; name: string } // `name` is the cleaned-up (trimmed) name to store
  | { ok: false; error: CategoryNameError };

// Lowercases using Turkish rules: "I" becomes "ı" and "İ" becomes "i".
// Done by hand instead of toLocaleLowerCase("tr"), so the result does not depend on
// the phone's JavaScript engine supporting Turkish.
function toTurkishLowerCase(text: string): string {
  return text.replace(/I/g, "ı").replace(/İ/g, "i").toLowerCase();
}

// True when two names count as the same, ignoring upper/lower case.
// Names match if they are equal under English OR Turkish rules, so the result never
// depends on the app's language.
export function isSameCategoryName(a: string, b: string): boolean {
  return (
    a.toLowerCase() === b.toLowerCase() ||
    toTurkishLowerCase(a) === toTurkishLowerCase(b)
  );
}

// Checks a name typed by the user for a category under `parentId`.
// When renaming, pass the category's own id as `ownId` so it is not compared with itself.
// When creating, pass null.
export function validateCategoryName(
  categories: Category[],
  rawName: string,
  parentId: string | null,
  ownId: string | null,
): CategoryNameResult {
  const name = rawName.trim();

  if (name === "") {
    return { ok: false, error: "empty" };
  }

  // [...name] splits into characters, so an emoji counts as 1 (name.length would say 2).
  if ([...name].length > MAX_CATEGORY_NAME_LENGTH) {
    return { ok: false, error: "too-long" };
  }

  const siblings = getChildCategories(categories, parentId);
  const hasDuplicate = siblings.some(
    (sibling) => sibling.id !== ownId && isSameCategoryName(sibling.name, name),
  );
  if (hasDuplicate) {
    return { ok: false, error: "duplicate" };
  }

  return { ok: true, name };
}
