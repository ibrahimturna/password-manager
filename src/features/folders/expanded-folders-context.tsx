import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { useVault } from "@/data/vault-context";

import { expandWithParents, toggleExpanded } from "./folder-tree";

// Which folders are open in the tree. This is display state, not vault data,
// so it lives in its own context. It is shared because the form screen opens
// folders after saving, while the home screen shows them.
type ExpandedFoldersState = {
  expandedIds: ReadonlySet<string>;
  setExpandedIds: Dispatch<SetStateAction<ReadonlySet<string>>>;
};

const ExpandedFoldersContext = createContext<ExpandedFoldersState | null>(null);

// Must be placed outside <VaultProvider>: locking removes everything inside it, and the
// open folders should still be open after unlocking. It holds only random ids, no names,
// and only in memory, so they are gone when Android closes the app.
export function ExpandedFoldersProvider({ children }: { children: ReactNode }) {
  // A Set makes "is this one open?" a quick lookup.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  return (
    <ExpandedFoldersContext value={{ expandedIds, setExpandedIds }}>
      {children}
    </ExpandedFoldersContext>
  );
}

// Only works inside <VaultProvider> too, because opening a folder reads the folders.
export function useExpandedFolders() {
  const state = useContext(ExpandedFoldersContext);
  if (state === null) {
    throw new Error("useExpandedFolders must be used inside <ExpandedFoldersProvider>.");
  }
  const { expandedIds, setExpandedIds } = state;
  const { folders } = useVault();

  function toggleFolder(folderId: string) {
    // `current` is the latest state; toggleExpanded returns a new Set, so React re-renders.
    setExpandedIds((current) => toggleExpanded(current, folderId, folders));
  }

  // Opens the folder and every folder above it. null (top level) changes nothing.
  function expandFolderWithParents(folderId: string | null) {
    if (folderId === null) return;
    setExpandedIds((current) => expandWithParents(current, folderId, folders));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  // Forgets deleted folders, so "Collapse all" does not count folders that are gone.
  function forgetFolders(folderIds: string[]) {
    setExpandedIds((current) => {
      const next = new Set(current);
      for (const id of folderIds) next.delete(id);
      return next;
    });
  }

  return {
    expandedIds,
    toggleFolder,
    expandWithParents: expandFolderWithParents,
    collapseAll,
    forgetFolders,
  };
}
