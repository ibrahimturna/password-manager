import type { Credential, Folder } from "@/types/vault";

// The shape of the rows in the database. Column names use snake_case, the SQL convention.
export type FolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
  position: number;
};

export type CredentialRow = {
  id: string;
  folder_id: string;
  title: string;
  username: string | null;
  password: string;
  created_at: number;
  updated_at: number;
  position: number;
};

export function folderFromRow(row: FolderRow): Folder {
  return { id: row.id, name: row.name, parentId: row.parent_id };
}

export function folderToRow(folder: Folder, position: number): FolderRow {
  return { id: folder.id, name: folder.name, parent_id: folder.parentId, position };
}

export function credentialFromRow(row: CredentialRow): Credential {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    username: row.username,
    password: row.password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function credentialToRow(credential: Credential, position: number): CredentialRow {
  return {
    id: credential.id,
    folder_id: credential.folderId,
    title: credential.title,
    username: credential.username,
    password: credential.password,
    created_at: credential.createdAt,
    updated_at: credential.updatedAt,
    position,
  };
}

export type ItemChanges<T> = {
  // New or changed items, with their position in the array.
  saved: { item: T; position: number }[];
  deletedIds: string[];
};

// Finds what must be written to the database to turn `before` into `after`.
// An item counts as changed when it is a different object or moved to another position.
// (The update functions keep unchanged items as the same object.)
export function findChanges<T extends { id: string }>(before: T[], after: T[]): ItemChanges<T> {
  const beforeById = new Map(before.map((item, position) => [item.id, { item, position }]));
  const afterIds = new Set(after.map((item) => item.id));

  const saved: ItemChanges<T>["saved"] = [];
  after.forEach((item, position) => {
    const old = beforeById.get(item.id);
    if (old === undefined || old.item !== item || old.position !== position) {
      saved.push({ item, position });
    }
  });

  return {
    saved,
    deletedIds: before.filter((item) => !afterIds.has(item.id)).map((item) => item.id),
  };
}
