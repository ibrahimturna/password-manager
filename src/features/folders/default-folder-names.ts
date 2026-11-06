import type { Folder } from "@/types/vault";

// A folder name the app chose itself, in every language, and the one for the current language.
export type DefaultFolderName = { names: string[]; current: string };

// Top-level folders that still carry an app-chosen name in another language get the current
// one, so they follow a language change. A folder the user renamed no longer matches and is
// left alone. "Imported from Chrome (2)" keeps its number.
export function getDefaultFolderRenames(
  folders: Folder[],
  defaults: DefaultFolderName[],
): { id: string; name: string }[] {
  const renames: { id: string; name: string }[] = [];
  for (const folder of folders) {
    if (folder.parentId !== null) continue;
    for (const { names, current } of defaults) {
      const match = names.find(
        (name) => name !== current && /^( \(\d+\))?$/.test(folder.name.slice(name.length)) &&
          folder.name.startsWith(name),
      );
      if (match !== undefined) {
        renames.push({ id: folder.id, name: current + folder.name.slice(match.length) });
      }
    }
  }
  return renames;
}
