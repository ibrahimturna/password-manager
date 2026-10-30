import { createContext, useContext, useState, type ReactNode } from "react";

import { useVault } from "@/data/vault-context";

import { expandWithParents, toggleExpanded } from "./category-tree";

// Which categories are open in the tree. This is display state, not vault data,
// so it lives in its own context. It is shared because the form screen opens
// categories after saving, while the home screen shows them.
type ExpandedCategoriesValue = {
  expandedIds: ReadonlySet<string>;
  toggleCategory: (categoryId: string) => void;
  // Opens the category and every category above it. null (top level) changes nothing.
  expandWithParents: (categoryId: string | null) => void;
  collapseAll: () => void;
  // Forgets deleted categories, so "Collapse all" does not count categories that are gone.
  forgetCategories: (categoryIds: string[]) => void;
};

const ExpandedCategoriesContext = createContext<ExpandedCategoriesValue | null>(null);

// Must be placed inside <VaultProvider>, because it reads the categories.
export function ExpandedCategoriesProvider({ children }: { children: ReactNode }) {
  const { categories } = useVault();
  // A Set makes "is this one open?" a quick lookup.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  function toggleCategory(categoryId: string) {
    // `current` is the latest state; toggleExpanded returns a new Set, so React re-renders.
    setExpandedIds((current) => toggleExpanded(current, categoryId, categories));
  }

  function expandCategoryWithParents(categoryId: string | null) {
    if (categoryId === null) return;
    setExpandedIds((current) => expandWithParents(current, categoryId, categories));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  function forgetCategories(categoryIds: string[]) {
    setExpandedIds((current) => {
      const next = new Set(current);
      for (const id of categoryIds) next.delete(id);
      return next;
    });
  }

  return (
    <ExpandedCategoriesContext
      value={{
        expandedIds,
        toggleCategory,
        expandWithParents: expandCategoryWithParents,
        collapseAll,
        forgetCategories,
      }}
    >
      {children}
    </ExpandedCategoriesContext>
  );
}

export function useExpandedCategories(): ExpandedCategoriesValue {
  const value = useContext(ExpandedCategoriesContext);
  if (value === null) {
    throw new Error("useExpandedCategories must be used inside <ExpandedCategoriesProvider>.");
  }
  return value;
}
