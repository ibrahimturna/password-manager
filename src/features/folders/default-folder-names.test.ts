import type { Folder } from "@/types/vault";

import { getDefaultFolderRenames } from "./default-folder-names";

const defaults = [
  { names: ["Saved logins", "Kaydedilen girişler"], current: "Kaydedilen girişler" },
  {
    names: ["Imported from Chrome", "Chrome'dan aktarılanlar"],
    current: "Chrome'dan aktarılanlar",
  },
];
const folder = (id: string, name: string, parentId: string | null = null): Folder => ({
  id,
  name,
  parentId,
});

describe("getDefaultFolderRenames", () => {
  it("renames app-named folders into the current language", () => {
    expect(
      getDefaultFolderRenames(
        [folder("a", "Saved logins"), folder("b", "Imported from Chrome")],
        defaults,
      ),
    ).toEqual([
      { id: "a", name: "Kaydedilen girişler" },
      { id: "b", name: "Chrome'dan aktarılanlar" },
    ]);
  });

  it("keeps the number of a second import", () => {
    expect(getDefaultFolderRenames([folder("b", "Imported from Chrome (2)")], defaults)).toEqual([
      { id: "b", name: "Chrome'dan aktarılanlar (2)" },
    ]);
  });

  it("leaves folders the user named, subfolders and current names alone", () => {
    expect(
      getDefaultFolderRenames(
        [
          folder("a", "Saved logins old"),
          folder("b", "Saved logins", "parent"),
          folder("c", "Kaydedilen girişler"),
        ],
        defaults,
      ),
    ).toEqual([]);
  });
});
