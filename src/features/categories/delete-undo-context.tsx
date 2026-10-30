import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useVault } from "@/data/vault-context";

import type { CategoryDeletion } from "./category-mutations";
import { getCategoryById } from "./category-tree";
import { useExpandedCategories } from "./expanded-categories-context";

// How long a delete can be undone.
const UNDO_DURATION_MS = 5000;

type PendingUndo = {
  deletion: CategoryDeletion;
  name: string; // the deleted category's name, for the "deleted" message
};

type DeleteUndoValue = {
  // The last delete while it can still be undone, or null.
  pendingUndo: PendingUndo | null;
  deleteCategoryWithUndo: (categoryId: string) => void;
  undoDelete: () => void;
  dismissUndo: () => void;
};

const DeleteUndoContext = createContext<DeleteUndoValue | null>(null);

// Deletes categories and keeps the last delete for a few seconds so it can be undone.
// Shared because the delete happens on the confirmation screen, while the Undo bar is on the home screen.
// Must be placed inside <VaultProvider> and <ExpandedCategoriesProvider>.
export function DeleteUndoProvider({ children }: { children: ReactNode }) {
  const { categories, deleteCategory, restoreDeletion } = useVault();
  const { forgetCategories } = useExpandedCategories();
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);

  function deleteCategoryWithUndo(categoryId: string) {
    const category = getCategoryById(categories, categoryId);
    if (category === undefined) return;

    const deletion = deleteCategory(categoryId);
    // Deleted categories must not stay in the open/closed state.
    forgetCategories(deletion.categories.map((removed) => removed.item.id));
    setPendingUndo({ deletion, name: category.name });
  }

  function undoDelete() {
    if (pendingUndo === null) return;
    restoreDeletion(pendingUndo.deletion);
    setPendingUndo(null);
  }

  // useCallback keeps this the same function on every render. The home screen uses it in a
  // focus effect; a new function each render would re-run that effect and end Undo too early.
  const dismissUndo = useCallback(() => setPendingUndo(null), []);

  // Ends the Undo chance after a few seconds. A new delete restarts the timer; the cleanup
  // function cancels the old timer so it cannot end the new Undo early.
  useEffect(() => {
    if (pendingUndo === null) return;
    const timer = setTimeout(() => setPendingUndo(null), UNDO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [pendingUndo]);

  return (
    <DeleteUndoContext
      value={{ pendingUndo, deleteCategoryWithUndo, undoDelete, dismissUndo }}
    >
      {children}
    </DeleteUndoContext>
  );
}

export function useDeleteUndo(): DeleteUndoValue {
  const value = useContext(DeleteUndoContext);
  if (value === null) {
    throw new Error("useDeleteUndo must be used inside <DeleteUndoProvider>.");
  }
  return value;
}
