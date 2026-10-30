import { getDescendantIds, getFolderPath } from "@/features/folders/folder-tree";
import type { Credential, Folder } from "@/types/vault";

// Turkish letters and their plain versions, so "yatirim" finds "Yatırım".
const PLAIN_LETTERS: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

// Makes text comparable for search: ignores upper/lower case (English and Turkish rules)
// and treats Turkish letters like their plain versions.
export function normalizeForSearch(text: string): string {
  return (
    text
      // Done before toLowerCase: "I" and "İ" both become "i" (toLowerCase would turn "İ"
      // into "i" plus a separate dot character).
      .replace(/[Iİ]/g, "i")
      .toLowerCase()
      .replace(/[çğıöşü]/g, (letter) => PLAIN_LETTERS[letter])
  );
}

// Which parts of the tree to show for a search.
export type SearchResult = {
  folderIds: ReadonlySet<string>; // folders to show
  credentialIds: ReadonlySet<string>; // credentials to show
  expandedIds: ReadonlySet<string>; // folders to open, so every match is visible
};

// Finds folders (by name) and credentials (by title or username) that contain `query`.
// Passwords are never searched. Returns null when the query is empty (show the normal tree).
//
// What is shown:
// - every match, with all folders above it (opened, so the match is visible);
// - for a matching folder, also everything inside it (closed, unless something inside matches).
export function searchVault(
  folders: Folder[],
  credentials: Credential[],
  query: string,
): SearchResult | null {
  const needle = normalizeForSearch(query.trim());
  if (needle === "") return null;

  const matches = (text: string | null) =>
    text !== null && normalizeForSearch(text).includes(needle);

  const folderIds = new Set<string>();
  const credentialIds = new Set<string>();
  const expandedIds = new Set<string>();

  // Shows a folder and all folders above it. `openSelf` also opens the folder itself.
  function showPath(folderId: string, openSelf: boolean) {
    for (const folder of getFolderPath(folders, folderId)) {
      folderIds.add(folder.id);
      if (openSelf || folder.id !== folderId) expandedIds.add(folder.id);
    }
  }

  for (const folder of folders) {
    if (!matches(folder.name)) continue;
    showPath(folder.id, false);
    // Everything inside a matching folder can be browsed.
    const insideIds = new Set([folder.id, ...getDescendantIds(folders, folder.id)]);
    for (const id of insideIds) folderIds.add(id);
    for (const credential of credentials) {
      if (insideIds.has(credential.folderId)) credentialIds.add(credential.id);
    }
  }

  for (const credential of credentials) {
    if (!matches(credential.title) && !matches(credential.username)) continue;
    credentialIds.add(credential.id);
    // Opens the folders down to the credential, including its own folder.
    showPath(credential.folderId, true);
  }

  return { folderIds, credentialIds, expandedIds };
}
