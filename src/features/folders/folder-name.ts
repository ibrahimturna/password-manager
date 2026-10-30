import type { Folder } from "@/types/vault";

import { getChildFolders } from "./folder-tree";

export const MAX_FOLDER_NAME_LENGTH = 50;

// Why a name was rejected. These are codes, not sentences, so the screen can
// show them in any language.
export type FolderNameError = "empty" | "too-long" | "duplicate";

export type FolderNameResult =
  | { ok: true; name: string } // `name` is the cleaned-up (trimmed) name to store
  | { ok: false; error: FolderNameError };

// Lowercases using Turkish rules: "I" becomes "ı" and "İ" becomes "i".
// Done by hand instead of toLocaleLowerCase("tr"), so the result does not depend on
// the phone's JavaScript engine supporting Turkish.
function toTurkishLowerCase(text: string): string {
  return text.replace(/I/g, "ı").replace(/İ/g, "i").toLowerCase();
}

// True when two names count as the same, ignoring upper/lower case.
// Names match if they are equal under English OR Turkish rules, so the result never
// depends on the app's language.
export function isSameFolderName(a: string, b: string): boolean {
  return (
    a.toLowerCase() === b.toLowerCase() ||
    toTurkishLowerCase(a) === toTurkishLowerCase(b)
  );
}

// Checks a name typed by the user for a folder under `parentId`.
// When renaming, pass the folder's own id as `ownId` so it is not compared with itself.
// When creating, pass null.
export function validateFolderName(
  folders: Folder[],
  rawName: string,
  parentId: string | null,
  ownId: string | null,
): FolderNameResult {
  const name = rawName.trim();

  if (name === "") {
    return { ok: false, error: "empty" };
  }

  // [...name] splits into characters, so an emoji counts as 1 (name.length would say 2).
  if ([...name].length > MAX_FOLDER_NAME_LENGTH) {
    return { ok: false, error: "too-long" };
  }

  const siblings = getChildFolders(folders, parentId);
  const hasDuplicate = siblings.some(
    (sibling) => sibling.id !== ownId && isSameFolderName(sibling.name, name),
  );
  if (hasDuplicate) {
    return { ok: false, error: "duplicate" };
  }

  return { ok: true, name };
}
