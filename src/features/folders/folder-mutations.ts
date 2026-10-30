import type { Credential, Folder } from "@/types/vault";
import { reinsert, type RemovedItem } from "@/utils/removed-items";

import { getDescendantIds } from "./folder-tree";

// Returns a new array with a new folder added at the end.
// The caller provides `id`, so this function always gives the same result for the same input
// (which keeps the tests predictable).
// Never changes `folders`, so React can see that the data changed.
// Names are validated by the repository before this is called.
export function addFolder(
  folders: Folder[],
  id: string,
  name: string,
  parentId: string | null,
): Folder[] {
  return [...folders, { id, name, parentId }];
}

// Returns a new array where the folder with `id` has the new name.
// Never changes `folders`, so React can see that the data changed.
// Names are validated by the repository before this is called.
export function renameFolder(folders: Folder[], id: string, name: string): Folder[] {
  return folders.map((folder) =>
    folder.id === id ? { ...folder, name } : folder,
  );
}

// Everything one delete removed. Keep it to undo the delete with restoreDeletion.
export type FolderDeletion = {
  folders: RemovedItem<Folder>[];
  credentials: RemovedItem<Credential>[];
};

type VaultItems = { folders: Folder[]; credentials: Credential[] };

// Removes a folder, every folder below it, and all their credentials.
// Returns the new arrays plus a record of what was removed (for Undo).
// Never changes the arrays it is given.
export function deleteFolder(
  folders: Folder[],
  credentials: Credential[],
  folderId: string,
): VaultItems & { deletion: FolderDeletion } {
  const deletedIds = new Set([folderId, ...getDescendantIds(folders, folderId)]);
  const deletion: FolderDeletion = { folders: [], credentials: [] };

  const keptFolders = folders.filter((folder, index) => {
    if (!deletedIds.has(folder.id)) return true;
    deletion.folders.push({ item: folder, index });
    return false;
  });
  const keptCredentials = credentials.filter((credential, index) => {
    if (!deletedIds.has(credential.folderId)) return true;
    deletion.credentials.push({ item: credential, index });
    return false;
  });

  return { folders: keptFolders, credentials: keptCredentials, deletion };
}

// Undoes a deleteFolder. Returns new arrays and never changes the ones it is given.
export function restoreDeletion(
  folders: Folder[],
  credentials: Credential[],
  deletion: FolderDeletion,
): VaultItems {
  return {
    folders: reinsert(folders, deletion.folders),
    credentials: reinsert(credentials, deletion.credentials),
  };
}
