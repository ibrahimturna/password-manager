// Core data models for the vault.
// Folders form a tree through `parentId`; credentials belong to one folder.

export type Folder = {
  id: string;
  name: string;
  // null means this is a top-level (root) folder.
  parentId: string | null;
};

export type Credential = {
  id: string;
  folderId: string;
  title: string;
  username: string | null;
  // Encrypted on disk, but plain text in memory while the app runs.
  password: string;
  // Milliseconds since the Unix epoch (Date.now()).
  createdAt: number;
  updatedAt: number;
};
