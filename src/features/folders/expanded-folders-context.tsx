import { createContext, useContext, useState, type ReactNode } from "react";

import { useVault } from "@/data/vault-context";

import { expandWithParents, toggleExpanded } from "./folder-tree";

// Which folders are open in the tree. This is display state, not vault data,
// so it lives in its own context. It is shared because the form screen opens
// folders after saving, while the home screen shows them.
type ExpandedFoldersValue = {
  expandedIds: ReadonlySet<string>;
  toggleFolder: (folderId: string) => void;
  // Opens the folder and every folder above it. null (top level) changes nothing.
  expandWithParents: (folderId: string | null) => void;
  collapseAll: () => void;
  // Forgets deleted folders, so "Collapse all" does not count folders that are gone.
  forgetFolders: (folderIds: string[]) => void;
};

const ExpandedFoldersContext = createContext<ExpandedFoldersValue | null>(null);

// Must be placed inside <VaultProvider>, because it reads the folders.
export function ExpandedFoldersProvider({ children }: { children: ReactNode }) {
  const { folders } = useVault();
  // A Set makes "is this one open?" a quick lookup.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  function toggleFolder(folderId: string) {
    // `current` is the latest state; toggleExpanded returns a new Set, so React re-renders.
    setExpandedIds((current) => toggleExpanded(current, folderId, folders));
  }

  function expandFolderWithParents(folderId: string | null) {
    if (folderId === null) return;
    setExpandedIds((current) => expandWithParents(current, folderId, folders));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  function forgetFolders(folderIds: string[]) {
    setExpandedIds((current) => {
      const next = new Set(current);
      for (const id of folderIds) next.delete(id);
      return next;
    });
  }

  return (
    <ExpandedFoldersContext
      value={{
        expandedIds,
        toggleFolder,
        expandWithParents: expandFolderWithParents,
        collapseAll,
        forgetFolders,
      }}
    >
      {children}
    </ExpandedFoldersContext>
  );
}

export function useExpandedFolders(): ExpandedFoldersValue {
  const value = useContext(ExpandedFoldersContext);
  if (value === null) {
    throw new Error("useExpandedFolders must be used inside <ExpandedFoldersProvider>.");
  }
  return value;
}
