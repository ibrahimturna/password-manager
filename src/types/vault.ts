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
  // Plain text is acceptable ONLY for in-memory mock data.
  // Must be replaced with protected storage before real credentials are allowed (Milestone 7).
  password: string;
  // Milliseconds since the Unix epoch (Date.now()).
  createdAt: number;
  updatedAt: number;
};
