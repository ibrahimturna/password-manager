import type { Credential, Folder } from "@/types/vault";

import {
  expandWithParents,
  getFolderById,
  getFolderPath,
  getChildFolders,
  getCredentialsInFolder,
  getDescendantIds,
  getSubtreeRows,
  getVisibleRows,
  toggleExpanded,
  type TreeRow,
} from "./folder-tree";

// Small, hand-made tree used only by these tests:
//
// Banks (root)
// ├── Investments
// │   └── Stocks
// └── Other
// Social (root)
// └── Other          <- same name as Banks › Other, different branch
// Empty (root)       <- has no children
const testFolders: Folder[] = [
  { id: "banks", name: "Banks", parentId: null },
  { id: "investments", name: "Investments", parentId: "banks" },
  { id: "stocks", name: "Stocks", parentId: "investments" },
  { id: "banks-other", name: "Other", parentId: "banks" },
  { id: "social", name: "Social", parentId: null },
  { id: "social-other", name: "Other", parentId: "social" },
  { id: "empty", name: "Empty", parentId: null },
];

// Builds a credential with only the fields these tests care about.
function makeCredential(id: string, folderId: string): Credential {
  return {
    id,
    folderId,
    title: id,
    username: null,
    password: "fake-password",
    createdAt: 0,
    updatedAt: 0,
  };
}

const testCredentials: Credential[] = [
  makeCredential("bank-login", "banks"),
  makeCredential("broker-login", "stocks"),
  makeCredential("second-bank-login", "banks"),
];

// Helper: compare by id so failures print short, readable lists.
function ids(folders: Folder[]): string[] {
  return folders.map((folder) => folder.id);
}

describe("getChildFolders", () => {
  it("returns top-level folders when parentId is null", () => {
    const result = getChildFolders(testFolders, null);

    expect(ids(result)).toEqual(["banks", "social", "empty"]);
  });

  it("returns only direct children, not grandchildren", () => {
    const result = getChildFolders(testFolders, "banks");

    // "stocks" is inside "investments", so it must not appear here.
    expect(ids(result)).toEqual(["investments", "banks-other"]);
  });

  it("returns children of a deeply nested folder", () => {
    const result = getChildFolders(testFolders, "investments");

    expect(ids(result)).toEqual(["stocks"]);
  });

  it("keeps folders with the same name apart when they are in different branches", () => {
    const result = getChildFolders(testFolders, "social");

    expect(ids(result)).toEqual(["social-other"]);
  });

  it("returns an empty list for a folder without children", () => {
    expect(getChildFolders(testFolders, "empty")).toEqual([]);
  });

  it("returns an empty list for an id that does not exist", () => {
    expect(getChildFolders(testFolders, "no-such-id")).toEqual([]);
  });

  it("returns an empty list when there are no folders at all", () => {
    expect(getChildFolders([], null)).toEqual([]);
  });
});

describe("getFolderById", () => {
  it("finds a top-level folder", () => {
    expect(getFolderById(testFolders, "banks")?.name).toBe("Banks");
  });

  it("finds a deeply nested folder", () => {
    expect(getFolderById(testFolders, "stocks")?.name).toBe("Stocks");
  });

  it("returns undefined for an id that does not exist", () => {
    expect(getFolderById(testFolders, "no-such-id")).toBeUndefined();
  });
});

describe("getCredentialsInFolder", () => {
  it("returns all credentials stored directly in the folder", () => {
    const result = getCredentialsInFolder(testCredentials, "banks");

    expect(result.map((credential) => credential.id)).toEqual([
      "bank-login",
      "second-bank-login",
    ]);
  });

  it("does not include credentials from subfolders", () => {
    // "broker-login" lives in "stocks", which is inside "banks" › "investments".
    const result = getCredentialsInFolder(testCredentials, "banks");

    expect(result.map((credential) => credential.id)).not.toContain("broker-login");
  });

  it("returns an empty list for a folder without credentials", () => {
    expect(getCredentialsInFolder(testCredentials, "empty")).toEqual([]);
  });
});

describe("getVisibleRows", () => {
  // Turns rows into short, indented strings so expectations read like the tree itself:
  // "[+]" = collapsed folder, "[-]" = expanded folder, "*" = credential.
  function describeRows(rows: TreeRow[]): string[] {
    return rows.map((row) => {
      const indent = "  ".repeat(row.depth);
      switch (row.kind) {
        case "folder":
          return `${indent}${row.isExpanded ? "[-]" : "[+]"} ${row.folder.name}`;
        case "credential":
          return `${indent}* ${row.credential.title}`;
        case "empty":
          return `${indent}(empty)`;
      }
    });
  }

  function visibleRows(expandedIds: string[]): string[] {
    return describeRows(getVisibleRows(testFolders, testCredentials, new Set(expandedIds)));
  }

  it("shows only top-level folders when nothing is expanded", () => {
    expect(visibleRows([])).toEqual(["[+] Banks", "[+] Social", "[+] Empty"]);
  });

  it("shows subfolders first, then credentials, inside an expanded folder", () => {
    expect(visibleRows(["banks"])).toEqual([
      "[-] Banks",
      "  [+] Investments",
      "  [+] Other",
      "  * bank-login",
      "  * second-bank-login",
      "[+] Social",
      "[+] Empty",
    ]);
  });

  it("shows deeply nested contents when every level is expanded", () => {
    expect(visibleRows(["banks", "investments", "stocks"])).toEqual([
      "[-] Banks",
      "  [-] Investments",
      "    [-] Stocks",
      "      * broker-login",
      "  [+] Other",
      "  * bank-login",
      "  * second-bank-login",
      "[+] Social",
      "[+] Empty",
    ]);
  });

  it("hides an expanded folder when its parent is collapsed", () => {
    // "investments" is expanded, but its parent "banks" is not, so it stays hidden.
    expect(visibleRows(["investments"])).toEqual(["[+] Banks", "[+] Social", "[+] Empty"]);
  });

  it("shows an empty marker inside an expanded folder with no contents", () => {
    expect(visibleRows(["empty"])).toEqual([
      "[+] Banks",
      "[+] Social",
      "[-] Empty",
      "  (empty)",
    ]);
  });

  it("ignores expanded ids that do not exist", () => {
    expect(visibleRows(["no-such-id"])).toEqual(["[+] Banks", "[+] Social", "[+] Empty"]);
  });

  it("returns no rows when there are no folders", () => {
    expect(getVisibleRows([], [], new Set())).toEqual([]);
  });
});

describe("getDescendantIds", () => {
  it("returns children and grandchildren at every depth", () => {
    expect(getDescendantIds(testFolders, "banks")).toEqual([
      "investments",
      "stocks",
      "banks-other",
    ]);
  });

  it("returns an empty list for a folder without children", () => {
    expect(getDescendantIds(testFolders, "stocks")).toEqual([]);
  });

  it("does not loop forever when folders point at each other", () => {
    const loopingFolders: Folder[] = [
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ];

    expect(getDescendantIds(loopingFolders, "a")).toEqual(["b"]);
  });
});

describe("toggleExpanded", () => {
  it("opens a closed folder", () => {
    const result = toggleExpanded(new Set(), "banks", testFolders);

    expect([...result]).toEqual(["banks"]);
  });

  it("closes an open folder", () => {
    const result = toggleExpanded(new Set(["banks", "social"]), "banks", testFolders);

    expect([...result]).toEqual(["social"]);
  });

  it("also closes every open folder inside the one being closed", () => {
    const result = toggleExpanded(
      new Set(["banks", "investments", "stocks", "social"]),
      "banks",
      testFolders,
    );

    // "social" is in a different branch, so it stays open.
    expect([...result]).toEqual(["social"]);
  });

  it("does not change the Set it was given", () => {
    const original = new Set(["banks"]);

    const result = toggleExpanded(original, "banks", testFolders);

    expect(result).not.toBe(original); // a different object…
    expect([...original]).toEqual(["banks"]); // …and the original is untouched
  });
});

describe("getFolderPath", () => {
  it("returns the folder and its parents, from the top level down", () => {
    expect(ids(getFolderPath(testFolders, "stocks"))).toEqual(["banks", "investments", "stocks"]);
  });

  it("returns only the folder itself for a top-level folder", () => {
    expect(ids(getFolderPath(testFolders, "banks"))).toEqual(["banks"]);
  });

  it("returns an empty list for a missing folder", () => {
    expect(getFolderPath(testFolders, "missing")).toEqual([]);
  });

  it("stops instead of looping forever when folders point at each other", () => {
    const loop: Folder[] = [
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ];

    expect(ids(getFolderPath(loop, "a"))).toEqual(["b", "a"]);
  });
});

describe("expandWithParents", () => {
  it("opens the folder and every folder above it", () => {
    const result = expandWithParents(new Set(), "stocks", testFolders);

    expect([...result].sort()).toEqual(["banks", "investments", "stocks"]);
  });

  it("keeps folders that were already open", () => {
    const result = expandWithParents(new Set(["social"]), "investments", testFolders);

    expect([...result].sort()).toEqual(["banks", "investments", "social"]);
  });

  it("returns a new Set and does not change the original", () => {
    const original: ReadonlySet<string> = new Set();

    const result = expandWithParents(original, "banks", testFolders);

    expect(result).not.toBe(original);
    expect(original.size).toBe(0);
  });
});

describe("getSubtreeRows", () => {
  // Turns rows into short labels, so failures are easy to read.
  function labels(rows: TreeRow[]): string[] {
    return rows.map((row) => {
      switch (row.kind) {
        case "folder":
          return `${row.depth}:folder:${row.folder.id}`;
        case "credential":
          return `${row.depth}:credential:${row.credential.id}`;
        case "empty":
          return `${row.depth}:empty:${row.parentId}`;
      }
    });
  }

  it("shows the folder at depth 0 with everything inside it expanded", () => {
    const rows = getSubtreeRows(testFolders, testCredentials, "banks");

    expect(labels(rows)).toEqual([
      "0:folder:banks",
      "1:folder:investments",
      "2:folder:stocks",
      "3:credential:broker-login",
      "1:folder:banks-other",
      "2:empty:banks-other",
      "1:credential:bank-login",
      "1:credential:second-bank-login",
    ]);
  });

  it("starts from a nested folder without showing its parents or siblings", () => {
    const rows = getSubtreeRows(testFolders, testCredentials, "investments");

    expect(labels(rows)).toEqual([
      "0:folder:investments",
      "1:folder:stocks",
      "2:credential:broker-login",
    ]);
  });

  it("shows an empty folder with an empty row", () => {
    expect(labels(getSubtreeRows(testFolders, testCredentials, "empty"))).toEqual([
      "0:folder:empty",
      "1:empty:empty",
    ]);
  });

  it("returns no rows for a missing folder", () => {
    expect(getSubtreeRows(testFolders, testCredentials, "missing")).toEqual([]);
  });
});
