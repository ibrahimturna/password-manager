import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import type { Credential, Folder } from "@/types/vault";

import { credentialToRow, folderToRow, type ItemChanges } from "./vault-rows";

const DATABASE_NAME = "vault.db";
const SCHEMA_VERSION = 2;
const MASTER_PASSWORD_ROW = "master-password";

// Removes a database left behind without its key, so a new vault can start clean.
// Only used when no key exists: without its key the old file can never be read.
export async function deleteUnreadableDatabase(): Promise<void> {
  try {
    await deleteDatabaseAsync(DATABASE_NAME);
  } catch {
    // There was no old database, which is the normal first start.
  }
}

// Opens the encrypted vault with its key, creating the tables on the first start.
// Throws if encryption is not available or the key is wrong: the vault must never run unencrypted.
export async function openVaultDatabase(vaultKey: string): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);

  // Without SQLCipher in the app (e.g. in Expo Go), "PRAGMA key" silently does nothing,
  // so check first instead of trusting it.
  const cipher = await db.getFirstAsync<{ cipher_version: string }>("PRAGMA cipher_version");
  if (cipher === null) {
    throw new Error("SQLCipher is not available in this build.");
  }

  // The key is hex digits made by this app, so it is safe to place in the SQL text.
  // The x'...' form uses it directly as the key, without slow password stretching.
  await db.execAsync(`PRAGMA key = "x'${vaultKey}'"`);
  await db.execAsync("PRAGMA foreign_keys = ON");

  // The first real read. It throws if the key does not match the file.
  const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  upgradeSchema(db, version?.user_version ?? 0);
  return db;
}

// Brings the tables up to date. user_version remembers the structure of each file,
// so existing vaults are upgraded instead of being recreated.
function upgradeSchema(db: SQLiteDatabase, fromVersion: number) {
  if (fromVersion >= SCHEMA_VERSION) return;

  db.withTransactionSync(() => {
    if (fromVersion < 1) {
      // DEFERRABLE: foreign keys are checked at the end of a transaction, so rows that refer
      // to each other can be saved and deleted in any order.
      db.execSync(`
        CREATE TABLE folders (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          parent_id TEXT REFERENCES folders (id) DEFERRABLE INITIALLY DEFERRED,
          position INTEGER NOT NULL
        );
        CREATE TABLE credentials (
          id TEXT PRIMARY KEY NOT NULL,
          folder_id TEXT NOT NULL REFERENCES folders (id) DEFERRABLE INITIALLY DEFERRED,
          title TEXT NOT NULL,
          username TEXT,
          password TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          position INTEGER NOT NULL
        );
      `);
    }
    if (fromVersion < 2) {
      db.execSync(
        "CREATE TABLE vault_settings (name TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
      );
    }
    db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
}

// The master password is kept inside the encrypted vault, so Settings can show it after
// unlocking. It cannot be read from the file without the vault key.
export function readMasterPassword(db: SQLiteDatabase): string | null {
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM vault_settings WHERE name = ?",
    MASTER_PASSWORD_ROW,
  );
  return row?.value ?? null;
}

export function writeMasterPassword(db: SQLiteDatabase, password: string) {
  db.runSync(
    "INSERT OR REPLACE INTO vault_settings (name, value) VALUES (?, ?)",
    MASTER_PASSWORD_ROW,
    password,
  );
}

// Writes the changes in one transaction: either all of them are saved, or none.
export function saveChanges(
  db: SQLiteDatabase,
  folderChanges: ItemChanges<Folder>,
  credentialChanges: ItemChanges<Credential>,
) {
  db.withTransactionSync(() => {
    for (const id of credentialChanges.deletedIds) {
      db.runSync("DELETE FROM credentials WHERE id = ?", id);
    }
    for (const id of folderChanges.deletedIds) {
      db.runSync("DELETE FROM folders WHERE id = ?", id);
    }

    for (const { item, position } of folderChanges.saved) {
      const row = folderToRow(item, position);
      db.runSync(
        `INSERT OR REPLACE INTO folders (id, name, parent_id, position)
         VALUES ($id, $name, $parentId, $position)`,
        { $id: row.id, $name: row.name, $parentId: row.parent_id, $position: row.position },
      );
    }
    for (const { item, position } of credentialChanges.saved) {
      const row = credentialToRow(item, position);
      db.runSync(
        `INSERT OR REPLACE INTO credentials
           (id, folder_id, title, username, password, created_at, updated_at, position)
         VALUES ($id, $folderId, $title, $username, $password, $createdAt, $updatedAt, $position)`,
        {
          $id: row.id,
          $folderId: row.folder_id,
          $title: row.title,
          $username: row.username,
          $password: row.password,
          $createdAt: row.created_at,
          $updatedAt: row.updated_at,
          $position: row.position,
        },
      );
    }
  });
}
