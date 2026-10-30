import type { Credential, Folder } from "@/types/vault";

import {
  credentialFromRow,
  credentialToRow,
  findChanges,
  folderFromRow,
  folderToRow,
} from "./vault-rows";

const folder: Folder = { id: "banks", name: "Banks", parentId: null };
const subfolder: Folder = { id: "cards", name: "Cards", parentId: "banks" };
const credential: Credential = {
  id: "bank",
  folderId: "banks",
  title: "Bank",
  username: null,
  password: "fake-password",
  createdAt: 1000,
  updatedAt: 2000,
};

describe("row conversion", () => {
  it("turns a folder into a row and back", () => {
    expect(folderToRow(subfolder, 3)).toEqual({
      id: "cards",
      name: "Cards",
      parent_id: "banks",
      position: 3,
    });
    expect(folderFromRow(folderToRow(subfolder, 3))).toEqual(subfolder);
  });

  it("turns a credential into a row and back", () => {
    expect(credentialToRow(credential, 1)).toEqual({
      id: "bank",
      folder_id: "banks",
      title: "Bank",
      username: null,
      password: "fake-password",
      created_at: 1000,
      updated_at: 2000,
      position: 1,
    });
    expect(credentialFromRow(credentialToRow(credential, 1))).toEqual(credential);
  });
});

describe("findChanges", () => {
  it("finds nothing when nothing changed", () => {
    expect(findChanges([folder, subfolder], [folder, subfolder])).toEqual({
      saved: [],
      deletedIds: [],
    });
  });

  it("finds a new item", () => {
    expect(findChanges([folder], [folder, subfolder])).toEqual({
      saved: [{ item: subfolder, position: 1 }],
      deletedIds: [],
    });
  });

  it("finds a changed item", () => {
    const renamed = { ...folder, name: "Bank Accounts" };

    expect(findChanges([folder, subfolder], [renamed, subfolder])).toEqual({
      saved: [{ item: renamed, position: 0 }],
      deletedIds: [],
    });
  });

  it("finds a deleted item and the items that moved up because of it", () => {
    expect(findChanges([folder, subfolder], [subfolder])).toEqual({
      saved: [{ item: subfolder, position: 0 }],
      deletedIds: ["banks"],
    });
  });
});
