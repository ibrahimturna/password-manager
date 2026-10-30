import type { Credential, Folder } from "@/types/vault";

// Returns the folders whose parent is `parentId`.
// parentId === null means "top-level folders".
export function getChildFolders(
  folders: Folder[],
  parentId: string | null,
): Folder[] {
  return folders.filter((folder) => folder.parentId === parentId);
}

// Returns the folder with the given id, or undefined if there is none.
export function getFolderById(
  folders: Folder[],
  id: string,
): Folder | undefined {
  return folders.find((folder) => folder.id === id);
}

// Returns the credentials stored directly in a folder (not in its subfolders).
export function getCredentialsInFolder(
  credentials: Credential[],
  folderId: string,
): Credential[] {
  return credentials.filter((credential) => credential.folderId === folderId);
}

// Returns the ids of every folder below `folderId`, at any depth.
export function getDescendantIds(folders: Folder[], folderId: string): string[] {
  const descendantIds: string[] = [];
  // Guards against malformed data where folders point at each other in a loop.
  const visited = new Set<string>([folderId]);

  function collect(parentId: string) {
    for (const child of getChildFolders(folders, parentId)) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      descendantIds.push(child.id);
      collect(child.id);
    }
  }

  collect(folderId);
  return descendantIds;
}

// Opens a closed folder, or closes an open one.
// Closing also closes every folder inside it, so it reopens fully collapsed.
// Returns a new Set and never changes `expandedIds`, so React can detect the change.
export function toggleExpanded(
  expandedIds: ReadonlySet<string>,
  folderId: string,
  folders: Folder[],
): Set<string> {
  const next = new Set(expandedIds);

  if (next.has(folderId)) {
    next.delete(folderId);
    for (const descendantId of getDescendantIds(folders, folderId)) {
      next.delete(descendantId);
    }
  } else {
    next.add(folderId);
  }

  return next;
}

// Returns the folder and all the folders above it, from the top level down.
// Example: "Borsa" → [Banka Hesaplarım, Yatırım Hesapları, Borsa].
// Returns [] if the folder does not exist.
export function getFolderPath(folders: Folder[], folderId: string): Folder[] {
  const path: Folder[] = [];
  // Guards against malformed data where folders point at each other in a loop.
  const visited = new Set<string>();
  let current = getFolderById(folders, folderId);

  while (current !== undefined && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current); // add to the front, because we walk upward
    current = current.parentId === null ? undefined : getFolderById(folders, current.parentId);
  }

  return path;
}

// Opens a folder and every folder above it, so its contents become visible in the tree.
// Returns a new Set and never changes `expandedIds`.
export function expandWithParents(
  expandedIds: ReadonlySet<string>,
  folderId: string,
  folders: Folder[],
): Set<string> {
  const next = new Set(expandedIds);
  for (const folder of getFolderPath(folders, folderId)) {
    next.add(folder.id);
  }
  return next;
}

// One visible line in the expandable tree. `depth` is the indentation level (0 = top level).
export type TreeRow =
  | { kind: "folder"; folder: Folder; depth: number; isExpanded: boolean }
  | { kind: "credential"; credential: Credential; depth: number }
  | { kind: "empty"; parentId: string; depth: number };

// Flattens the folder tree into the rows that are currently visible.
// A folder's contents (subfolders first, then credentials) appear only when it is expanded.
export function getVisibleRows(
  folders: Folder[],
  credentials: Credential[],
  expandedIds: ReadonlySet<string>,
): TreeRow[] {
  const rows: TreeRow[] = [];

  function addContents(parentId: string | null, depth: number) {
    for (const folder of getChildFolders(folders, parentId)) {
      const isExpanded = expandedIds.has(folder.id);
      rows.push({ kind: "folder", folder, depth, isExpanded });

      if (isExpanded) {
        const rowCountBefore = rows.length;

        addContents(folder.id, depth + 1);
        for (const credential of getCredentialsInFolder(credentials, folder.id)) {
          rows.push({ kind: "credential", credential, depth: depth + 1 });
        }

        // Nothing was added, so tell the user the folder is empty.
        if (rows.length === rowCountBefore) {
          rows.push({ kind: "empty", parentId: folder.id, depth: depth + 1 });
        }
      }
    }
  }

  addContents(null, 0);
  return rows;
}

// The rows of one folder and everything inside it, fully expanded, with the folder
// itself at depth 0. Used to preview what a delete will remove.
// Returns [] if the folder does not exist.
export function getSubtreeRows(
  folders: Folder[],
  credentials: Credential[],
  folderId: string,
): TreeRow[] {
  const root = getFolderById(folders, folderId);
  if (root === undefined) return [];

  const subtreeIds = new Set([folderId, ...getDescendantIds(folders, folderId)]);
  // Only the subtree, with its root shown as a top-level folder.
  const subtreeFolders = folders
    .filter((folder) => subtreeIds.has(folder.id))
    .map((folder) => (folder.id === folderId ? { ...folder, parentId: null } : folder));
  const subtreeCredentials = credentials.filter((credential) =>
    subtreeIds.has(credential.folderId),
  );

  return getVisibleRows(subtreeFolders, subtreeCredentials, subtreeIds);
}
