import { Directory, File, Paths } from "expo-file-system";
import { Buffer } from "react-native-quick-crypto";
import * as Sharing from "expo-sharing";

import type { VaultContents } from "@/data/vault-repository";
import { openWithPassword, sealWithPassword } from "@/features/lock/vault-keys";

import {
  BACKUP_MIME_TYPE,
  createBackupFile,
  getBackupFileName,
  parseBackupContents,
  parseBackupFile,
  toPlainBytes,
} from "./backup-file";

// Android refuses the Downloads folder itself as a save location, so the picker opens here.
const DOCUMENTS_FOLDER_URI =
  "content://com.android.externalstorage.documents/document/primary:Documents";

// Encrypts the vault the same way as the vault key, and returns the text of a backup file.
async function createBackupText(contents: VaultContents, password: string): Promise<string> {
  const bytes = toPlainBytes(Buffer.from(JSON.stringify(contents), "utf8"));
  return createBackupFile(await sealWithPassword(bytes, password));
}

// Android's folder picker. Null when the user cancels.
export async function pickBackupFolder(): Promise<Directory | null> {
  try {
    return await Directory.pickDirectoryAsync(DOCUMENTS_FOLDER_URI);
  } catch {
    return null;
  }
}

export async function saveBackup(
  folder: Directory,
  contents: VaultContents,
  password: string,
): Promise<void> {
  const text = await createBackupText(contents, password);
  folder.createFile(getBackupFileName(new Date()), BACKUP_MIME_TYPE).write(text);
}

// Shares a temporary copy, which is deleted afterwards. It stays encrypted either way.
export async function shareBackup(contents: VaultContents, password: string): Promise<void> {
  const file = new File(Paths.cache, getBackupFileName(new Date()));
  file.create({ overwrite: true });
  try {
    file.write(await createBackupText(contents, password));
    await Sharing.shareAsync(file.uri, { mimeType: BACKUP_MIME_TYPE });
  } finally {
    file.delete();
  }
}

// Android's file picker. Null when the user cancels.
export async function pickBackupFile(): Promise<File | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ["*/*"] });
  return picked.canceled ? null : picked.result;
}

// "invalid": not a backup file of this app. "wrong-password": a backup, but it would not open.
export type OpenBackupResult =
  | { ok: true; contents: VaultContents }
  | { ok: false; error: "invalid" | "wrong-password" };

export async function openBackup(file: File, password: string): Promise<OpenBackupResult> {
  const sealed = parseBackupFile(await file.text());
  if (sealed === null) return { ok: false, error: "invalid" };

  const bytes = await openWithPassword(sealed, password);
  if (bytes === null) return { ok: false, error: "wrong-password" };

  const contents = parseBackupContents(Buffer.from(bytes).toString("utf8"));
  return contents === null ? { ok: false, error: "invalid" } : { ok: true, contents };
}

// Checks a chosen file before asking for its password.
export async function isBackupFile(file: File): Promise<boolean> {
  return parseBackupFile(await file.text()) !== null;
}
