import type { VaultContents } from "@/data/vault-repository";
import { parseWrappedKey, type WrappedKey } from "@/features/lock/lock-rules";
import type { Credential, Folder } from "@/types/vault";

// A backup file is a small JSON text: these two fields say what it is, the rest is the
// encrypted vault in the same form as the wrapped vault key.
const BACKUP_TYPE = "password-manager-backup";
const BACKUP_VERSION = 1;
// More Argon2 memory than this means the file is damaged or made to crash the app.
const MAX_MEMORY_KIB = 1024 * 1024;

export const BACKUP_MIME_TYPE = "application/octet-stream";

export function getBackupFileName(date: Date): string {
  const day = date.toISOString().slice(0, 10);
  return `password-manager-backup-${day}.pmbackup`;
}

// Expo's native code looks typed arrays up by their class name and does not know "Buffer",
// so bytes held in a Buffer must be copied into a plain Uint8Array before encrypting.
export function toPlainBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

export function createBackupFile(sealed: WrappedKey): string {
  return JSON.stringify({ type: BACKUP_TYPE, version: BACKUP_VERSION, ...sealed });
}

// Reads a chosen file. Returns null if it is not a backup this app can read.
export function parseBackupFile(text: string): WrappedKey | null {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return null;
    const { type, version } = value as Record<string, unknown>;
    if (type !== BACKUP_TYPE || version !== BACKUP_VERSION) return null;
  } catch {
    return null;
  }
  const sealed = parseWrappedKey(text);
  return sealed !== null && sealed.memory <= MAX_MEMORY_KIB ? sealed : null;
}

function isFolder(value: unknown): value is Folder {
  if (typeof value !== "object" || value === null) return false;
  const { id, name, parentId } = value as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof name === "string" &&
    (typeof parentId === "string" || parentId === null)
  );
}

function isCredential(value: unknown): value is Credential {
  if (typeof value !== "object" || value === null) return false;
  const { id, folderId, title, username, password, createdAt, updatedAt } = value as Record<
    string,
    unknown
  >;
  return (
    typeof id === "string" &&
    typeof folderId === "string" &&
    typeof title === "string" &&
    (typeof username === "string" || username === null) &&
    typeof password === "string" &&
    typeof createdAt === "number" &&
    typeof updatedAt === "number"
  );
}

// Reads the decrypted vault. Returns null unless every item is valid and every folder and
// credential points at a folder that exists in the backup.
export function parseBackupContents(text: string): VaultContents | null {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return null;
    const { folders, credentials } = value as Record<string, unknown>;
    if (!Array.isArray(folders) || !folders.every(isFolder)) return null;
    if (!Array.isArray(credentials) || !credentials.every(isCredential)) return null;

    const folderIds = new Set(folders.map((folder) => folder.id));
    const hasValidLinks =
      folders.every((folder) => folder.parentId === null || folderIds.has(folder.parentId)) &&
      credentials.every((credential) => folderIds.has(credential.folderId));
    return hasValidLinks ? { folders, credentials } : null;
  } catch {
    return null;
  }
}
