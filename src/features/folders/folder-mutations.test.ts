import type { Credential, Folder } from "@/types/vault";

import {
  addFolder,
  deleteFolder,
  moveFolder,
  renameFolder,
  restoreDeletion,
} from "./folder-mutations";

const testFolders: Folder[] = [
  { id: "banks", name: "Banks", parentId: null },
  { id: "investments", name: "Investments", parentId: "banks" },
  { id: "social", name: "Social", parentId: null },
];

describe("moveFolder", () => {
  const folders: Folder[] = [
    { id: "a", name: "A", parentId: null },
    { id: "a1", name: "A1", parentId: "a" },
    { id: "b", name: "B", parentId: null },
    { id: "a2", name: "A2", parentId: "a" },
    { id: "c", name: "C", parentId: null },
    { id: "a3", name: "A3", parentId: "a" },
  ];
  const ids = (result: Folder[]) => result.map((folder) => folder.id);

  it("moves a top-level folder and leaves subfolders where they are", () => {
    expect(ids(moveFolder(folders, null, 2, 0))).toEqual(["c", "a1", "a", "a2", "b", "a3"]);
  });

  it("moves a subfolder only among its own parent's folders", () => {
    expect(ids(moveFolder(folders, "a", 0, 2))).toEqual(["a", "a2", "b", "a3", "c", "a1"]);
  });

  it("keeps every folder's parent", () => {
    const result = moveFolder(folders, null, 0, 2);

    expect(result.find((folder) => folder.id === "a2")?.parentId).toBe("a");
    expect(result).toHaveLength(folders.length);
  });

  it("does not change the original array", () => {
    moveFolder(folders, null, 0, 2);

    expect(ids(folders)).toEqual(["a", "a1", "b", "a2", "c", "a3"]);
  });

  it("returns the same array when there is nothing to move", () => {
    expect(moveFolder(folders, null, 9, 0)).toBe(folders);
  });
});

describe("addFolder", () => {
  it("adds a top-level folder at the end", () => {
    const result = addFolder(testFolders, "email", "E-mail", null);

    expect(result).toHaveLength(4);
    expect(result[3]).toEqual({ id: "email", name: "E-mail", parentId: null });
  });

  it("adds a subfolder under the given parent", () => {
    const result = addFolder(testFolders, "stocks", "Stocks", "investments");

    expect(result[3]).toEqual({ id: "stocks", name: "Stocks", parentId: "investments" });
  });

  it("returns a new array and does not change the original", () => {
    const result = addFolder(testFolders, "email", "E-mail", null);

    expect(result).not.toBe(testFolders);
    expect(testFolders).toHaveLength(3);
  });
});

describe("renameFolder", () => {
  it("changes the name of the matching folder only", () => {
    const result = renameFolder(testFolders, "investments", "Savings");

    expect(result).toEqual([
      { id: "banks", name: "Banks", parentId: null },
      { id: "investments", name: "Savings", parentId: "banks" },
      { id: "social", name: "Social", parentId: null },
    ]);
  });

  it("returns a new array and does not change the original", () => {
    const result = renameFolder(testFolders, "banks", "Bank Accounts");

    expect(result).not.toBe(testFolders);
    expect(testFolders[0].name).toBe("Banks");
  });

  it("leaves every folder unchanged when the id does not exist", () => {
    const result = renameFolder(testFolders, "missing", "Anything");

    expect(result).toEqual(testFolders);
  });
});

// A deeper tree for the delete tests:
//
// Banks
// ├── Investments
// │   └── Stocks
// └── Cards
// Social
const deleteTestFolders: Folder[] = [
  { id: "banks", name: "Banks", parentId: null },
  { id: "investments", name: "Investments", parentId: "banks" },
  { id: "social", name: "Social", parentId: null },
  { id: "stocks", name: "Stocks", parentId: "investments" },
  { id: "cards", name: "Cards", parentId: "banks" },
];

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

const deleteTestCredentials: Credential[] = [
  makeCredential("bank-login", "banks"),
  makeCredential("instagram", "social"),
  makeCredential("broker", "stocks"),
  makeCredential("card", "cards"),
];

function ids(items: { id: string }[]): string[] {
  return items.map((item) => item.id);
}

describe("deleteFolder", () => {
  it("removes the folder, everything below it, and their credentials", () => {
    const result = deleteFolder(deleteTestFolders, deleteTestCredentials, "banks");

    expect(ids(result.folders)).toEqual(["social"]);
    expect(ids(result.credentials)).toEqual(["instagram"]);
  });

  it("leaves other branches untouched when deleting a nested folder", () => {
    const result = deleteFolder(deleteTestFolders, deleteTestCredentials, "investments");

    expect(ids(result.folders)).toEqual(["banks", "social", "cards"]);
    expect(ids(result.credentials)).toEqual(["bank-login", "instagram", "card"]);
  });

  it("does not change the arrays it is given", () => {
    deleteFolder(deleteTestFolders, deleteTestCredentials, "banks");

    expect(deleteTestFolders).toHaveLength(5);
    expect(deleteTestCredentials).toHaveLength(4);
  });
});

describe("restoreDeletion", () => {
  it("puts everything back in its original order", () => {
    const { folders, credentials, deletion } = deleteFolder(
      deleteTestFolders,
      deleteTestCredentials,
      "banks",
    );

    const restored = restoreDeletion(folders, credentials, deletion);

    expect(restored.folders).toEqual(deleteTestFolders);
    expect(restored.credentials).toEqual(deleteTestCredentials);
  });

  it("restores a nested folder to its original place", () => {
    const { folders, credentials, deletion } = deleteFolder(
      deleteTestFolders,
      deleteTestCredentials,
      "investments",
    );

    const restored = restoreDeletion(folders, credentials, deletion);

    expect(restored.folders).toEqual(deleteTestFolders);
    expect(restored.credentials).toEqual(deleteTestCredentials);
  });
});
