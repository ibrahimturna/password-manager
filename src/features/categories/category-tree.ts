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

// Returns the ids of every category below `categoryId`, at any depth.
export function getDescendantIds(categories: Category[], categoryId: string): string[] {
  const descendantIds: string[] = [];
  // Guards against malformed data where categories point at each other in a loop.
  const visited = new Set<string>([categoryId]);

  function collect(parentId: string) {
    for (const child of getChildCategories(categories, parentId)) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      descendantIds.push(child.id);
      collect(child.id);
    }
  }

  collect(categoryId);
  return descendantIds;
}

// Opens a closed category, or closes an open one.
// Closing also closes every category inside it, so it reopens fully collapsed.
// Returns a new Set and never changes `expandedIds`, so React can detect the change.
export function toggleExpanded(
  expandedIds: ReadonlySet<string>,
  categoryId: string,
  categories: Category[],
): Set<string> {
  const next = new Set(expandedIds);

  if (next.has(categoryId)) {
    next.delete(categoryId);
    for (const descendantId of getDescendantIds(categories, categoryId)) {
      next.delete(descendantId);
    }
  } else {
    next.add(categoryId);
  }

  return next;
}

// Returns the category and all the categories above it, from the top level down.
// Example: "Borsa" → [Banka Hesaplarım, Yatırım Hesapları, Borsa].
// Returns [] if the category does not exist.
export function getCategoryPath(categories: Category[], categoryId: string): Category[] {
  const path: Category[] = [];
  // Guards against malformed data where categories point at each other in a loop.
  const visited = new Set<string>();
  let current = getCategoryById(categories, categoryId);

  while (current !== undefined && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current); // add to the front, because we walk upward
    current = current.parentId === null ? undefined : getCategoryById(categories, current.parentId);
  }

  return path;
}

// Opens a category and every category above it, so its contents become visible in the tree.
// Returns a new Set and never changes `expandedIds`.
export function expandWithParents(
  expandedIds: ReadonlySet<string>,
  categoryId: string,
  categories: Category[],
): Set<string> {
  const next = new Set(expandedIds);
  for (const category of getCategoryPath(categories, categoryId)) {
    next.add(category.id);
  }
  return next;
}

// One visible line in the expandable tree. `depth` is the indentation level (0 = top level).
export type TreeRow =
  | { kind: "category"; category: Category; depth: number; isExpanded: boolean }
  | { kind: "credential"; credential: Credential; depth: number }
  | { kind: "empty"; parentId: string; depth: number };

// Flattens the category tree into the rows that are currently visible.
// A category's contents (subcategories first, then credentials) appear only when it is expanded.
export function getVisibleRows(
  categories: Category[],
  credentials: Credential[],
  expandedIds: ReadonlySet<string>,
): TreeRow[] {
  const rows: TreeRow[] = [];

  function addContents(parentId: string | null, depth: number) {
    for (const category of getChildCategories(categories, parentId)) {
      const isExpanded = expandedIds.has(category.id);
      rows.push({ kind: "category", category, depth, isExpanded });

      if (isExpanded) {
        const rowCountBefore = rows.length;

        addContents(category.id, depth + 1);
        for (const credential of getCredentialsInCategory(credentials, category.id)) {
          rows.push({ kind: "credential", credential, depth: depth + 1 });
        }

        // Nothing was added, so tell the user the category is empty.
        if (rows.length === rowCountBefore) {
          rows.push({ kind: "empty", parentId: category.id, depth: depth + 1 });
        }
      }
    }
  }

  addContents(null, 0);
  return rows;
}

// The rows of one category and everything inside it, fully expanded, with the category
// itself at depth 0. Used to preview what a delete will remove.
// Returns [] if the category does not exist.
export function getSubtreeRows(
  categories: Category[],
  credentials: Credential[],
  categoryId: string,
): TreeRow[] {
  const root = getCategoryById(categories, categoryId);
  if (root === undefined) return [];

  const subtreeIds = new Set([categoryId, ...getDescendantIds(categories, categoryId)]);
  // Only the subtree, with its root shown as a top-level category.
  const subtreeCategories = categories
    .filter((category) => subtreeIds.has(category.id))
    .map((category) => (category.id === categoryId ? { ...category, parentId: null } : category));
  const subtreeCredentials = credentials.filter((credential) =>
    subtreeIds.has(credential.categoryId),
  );

  return getVisibleRows(subtreeCategories, subtreeCredentials, subtreeIds);
}
