import { getRandomBytes } from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { mockCredentials, mockFolders } from "@/data/mock-vault";
import type { Credential, Folder } from "@/types/vault";

import { credentialToRow, findChanges, folderToRow, type ItemChanges } from "./vault-rows";

const DATABASE_NAME = "vault.db";
const KEY_STORAGE_NAME = "vault-database-key";
const KEY_BYTES = 32; // 256 bits
const SCHEMA_VERSION = 1;

// Temporary until Milestone 7: the key is random and kept in the Android Keystore through
// SecureStore. Milestone 7 replaces it with a key derived from the master password.
async function loadOrCreateKey(): Promise<string> {
  const existingKey = await SecureStore.getItemAsync(KEY_STORAGE_NAME);
  if (existingKey !== null) return existingKey;

  // Without its key an old database can never be read again (the key is deleted on uninstall,
  // but a backup could bring the file back), so start over with a new file.
  try {
    await deleteDatabaseAsync(DATABASE_NAME);
  } catch {
    // There was no old database, which is the normal first start.
  }

  const key = [...getRandomBytes(KEY_BYTES)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  await SecureStore.setItemAsync(KEY_STORAGE_NAME, key);
  return key;
}

// Opens the encrypted vault, creating it on the first start.
// Throws if encryption is not available or the key is wrong: the vault must never run unencrypted.
export async function openVaultDatabase(): Promise<SQLiteDatabase> {
  const key = await loadOrCreateKey();
  const db = await openDatabaseAsync(DATABASE_NAME);

  // Without SQLCipher in the app (e.g. in Expo Go), "PRAGMA key" silently does nothing,
  // so check first instead of trusting it.
  const cipher = await db.getFirstAsync<{ cipher_version: string }>("PRAGMA cipher_version");
  if (cipher === null) {
    throw new Error("SQLCipher is not available in this build.");
  }

  // The key is hex digits made by this app, so it is safe to place in the SQL text.
  // The x'...' form uses it directly as the key, without slow password stretching.
  await db.execAsync(`PRAGMA key = "x'${key}'"`);
  await db.execAsync("PRAGMA foreign_keys = ON");

  // The first real read. It throws if the key does not match the file.
  const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  if ((version?.user_version ?? 0) === 0) {
    createSchema(db);
  }
  return db;
}

// Creates the tables and fills a brand-new vault with the sample data.
// user_version remembers the table structure, so later versions can upgrade existing files.
function createSchema(db: SQLiteDatabase) {
  db.withTransactionSync(() => {
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
    writeChanges(db, findChanges([], mockFolders), findChanges([], mockCredentials));
    db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
}

// Writes the changes in one transaction: either all of them are saved, or none.
export function saveChanges(
  db: SQLiteDatabase,
  folderChanges: ItemChanges<Folder>,
  credentialChanges: ItemChanges<Credential>,
) {
  db.withTransactionSync(() => writeChanges(db, folderChanges, credentialChanges));
}

function writeChanges(
  db: SQLiteDatabase,
  folderChanges: ItemChanges<Folder>,
  credentialChanges: ItemChanges<Credential>,
) {
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
}
