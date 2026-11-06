# Cloud Sync Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optional, end-to-end encrypted cloud sync for the phone app: accounts (Google or email), the key design with three recovery paths, a Supabase server, and two-way sync with conflicts, live updates and background downloads.

**Architecture:** The local encrypted SQLite vault stays the main copy. Every change is recorded in a local outbox. A sync engine (pure TypeScript, tested against a fake server) uploads outbox items encrypted with the vault key and downloads newer revisions through a small server interface. One adapter implements that interface with `@supabase/supabase-js`. Screens only call a new `SyncProvider` context.

**Tech Stack:** Expo SDK 58, TypeScript strict, Jest (`jest-expo`), `expo-crypto` (AES-GCM, already used), `react-native-quick-crypto` (Argon2id, X25519), Supabase (Postgres, Auth, Realtime, Edge Functions in Deno), `@supabase/supabase-js`, `expo-web-browser` + `expo-linking` (Google sign-in), `expo-background-task` (background downloads).

**Spec:** `docs/superpowers/specs/2026-11-06-cloud-sync-design.md`

## Global Constraints

- Before using any Expo API, read the versioned docs at `https://docs.expo.dev/versions/v58.0.0/` (AGENTS.md). Add packages with `npx expo install <package>`, never `npm install`.
- `npx tsc --noEmit`, `npx expo lint` and `npx jest` must pass at the end of every task.
- Every user-visible text exists in `src/i18n/en.ts` and `src/i18n/tr.ts`. Every feature change updates `FEATURES.md` in English and Turkish in the same task, and `SECURITY.md` when it changes what leaves the phone.
- Sync is optional: with no account, the app behaves exactly as today. Nothing is re-encrypted or wiped; the existing vault key is reused.
- The server never receives the master password, the password key, or the vault key, except the account-recovery copy, which exists only when the user turns on "Recover with my account".
- Account recovery waits 3 days and emails the owner a cancel link.
- Frequencies: `live` (default), `15min`, `hourly`, `daily`. Background minimum is 15 minutes.
- Conflict rule: later `updatedAt` wins; a losing password is kept in a "Sync conflicts" folder; a losing folder version is dropped; links have no versions.
- Native code changes (new native packages, `app.json`) are grouped into Task 11, so only one new build is needed for this project.

## Review Focus

- Clock skew between devices: two edits with equal or reversed `updatedAt`. Expected: deterministic winner (later `updatedAt`; on a tie, the version whose JSON sorts later), never data loss. Tested in Task 4.
- Interrupted sync (app killed between upload and download, or mid-download). Expected: the next sync finishes it, no duplicates, no lost outbox entries. Tested in Task 5.
- A password deleted on one device while edited on another. Expected: the edit wins and the password comes back, because deleting is a lower-risk loss to undo than an edit. Tested in Task 4.
- Changing the master password on a device with sync on. Expected: the server password copy and, for email accounts, the account password are replaced, and other devices then unlock with the new password. Tested in Task 9.
- A downloaded item that will not decrypt. Expected: skipped, kept for retry, shown on the Sync screen, never overwrites local data. Tested in Task 5.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20261106000000_sync.sql` | Tables, revision sequence, row-level security, `push_items` function |
| `supabase/functions/account-recovery/index.ts` | Edge function: enable, start, cancel and finish account recovery |
| `src/features/sync/account-keys.ts` | Account password, recovery code, key pair, sealing the vault key |
| `src/features/sync/sync-items.ts` | Turning local folders, passwords and links into encrypted server items and back |
| `src/features/sync/sync-merge.ts` | Conflict rules: what a downloaded item does to the local vault |
| `src/features/sync/sync-engine.ts` | One sync: upload outbox, download, merge, remember revisions |
| `src/features/sync/sync-server.ts` | The `SyncServer` interface and the Supabase adapter |
| `src/features/sync/supabase-client.ts` | The Supabase client and its session storage |
| `src/features/sync/sync-settings.ts` | Auto sync, frequency, last sync time (kv-store) |
| `src/features/sync/sync-context.tsx` | `SyncProvider`: account state, triggers, Realtime, "Sync now" |
| `src/features/sync/download-queue.ts` | Encrypted items downloaded while locked |
| `src/features/sync/background-sync.ts` | Background task that fills the download queue |
| `src/data/vault-database.ts` | Schema version 4: `sync_outbox`, `sync_revisions` |
| `src/app/account.tsx` | Sign in, create account, Google |
| `src/app/sync.tsx` | Sync screen |
| `src/app/recover.tsx` | Recovery with code or account |

---

### Task 1: Server schema and row-level security

**Files:**
- Create: `supabase/config.toml` (from `npx supabase init`), `supabase/migrations/20261106000000_sync.sql`
- Create: `src/features/sync/server.integration.test.ts`

**Interfaces:**
- Produces tables:
  - `vaults(id uuid pk default gen_random_uuid(), owner uuid not null references auth.users, created_at timestamptz default now())`
  - `items(vault_id uuid references vaults, id text, kind text check (kind in ('folder','credential','link')), revision bigint not null, deleted boolean not null default false, data text, primary key (vault_id, id))`
  - `account_keys(user_id uuid pk references auth.users, vault_id uuid references vaults, password_copy jsonb not null, recovery_copy jsonb not null, public_key text not null, private_key_sealed text not null)`
  - `recovery_requests(id uuid pk, user_id uuid, requested_at timestamptz, cancel_token text, cancelled boolean default false, finished boolean default false)`
  - `account_recovery(user_id uuid pk, escrow text not null)`. No client access; only the edge function, with the service role.
  - Task 9 adds `account_keys.recovery_proof text`.
- Produces SQL function `push_items(p_vault uuid, p_items jsonb) returns jsonb`: for each `{id, kind, deleted, data, base_revision}`, if the stored revision is greater than `base_revision`, add `{id, revision, deleted, data}` of the stored row to the returned `conflicts` array. Otherwise upsert with `revision = nextval('item_revision')`. Returns `{ "revisions": {id: revision}, "conflicts": [...] }`. `security invoker`, so row-level security applies.
- Row-level security: `vaults`, `items` and `account_keys` are readable and writable only where the vault's `owner = auth.uid()`. `recovery_requests` is readable by its own `user_id` only.

- [ ] **Step 1: Write the failing integration test.** It runs only when `SUPABASE_TEST_URL` and `SUPABASE_TEST_ANON_KEY` are set (`describe.skip` otherwise). It signs up two throwaway users and asserts:
  - user A can insert into its own vault through `push_items`, and the returned revision is greater than 0;
  - user B's `select` on A's vault returns `[]`;
  - pushing A's item with an old `base_revision` returns it in `conflicts` and does not change the stored `data`.
- [ ] **Step 2:** Create a free Supabase project named `password-manager-dev` (the user does this in the Supabase dashboard). The spec suggests a local Supabase, but that needs Docker Desktop, which is large on C:, so a hosted test project is used instead. Put its URL and anon key in `.env.local` (already ignored by git). Run the test: expected FAIL, missing tables.
- [ ] **Step 3:** Write the migration. Apply it with `npx supabase link` and `npx supabase db push`.
- [ ] **Step 4:** Run `npx jest src/features/sync/server.integration.test.ts` with the env vars set. Expected: PASS.
- [ ] **Step 5:** Commit `supabase/` and the test.

### Task 2: Account keys

**Files:**
- Create: `src/features/sync/account-keys.ts`, `src/features/sync/account-keys.test.ts`
- Modify: `src/features/lock/vault-keys.ts`. Export `deriveKey` and `KDF_MEMORY_KIB`, `KDF_PASSES`, `KDF_PARALLELISM`; change nothing else.

**Interfaces:**
- Produces:
  - `deriveAccountPassword(email: string, masterPassword: string): Promise<string>`. Argon2id with the vault settings, salt `SHA-256("password-manager/account:" + email.trim().toLowerCase())` (first 16 bytes), output hex. Same input, same output on every device; different from the password key because the salt differs.
  - `createRecoveryCode(): string`. 24 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` drawn with `randomBelow` from `password-generator.ts`, grouped `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`.
  - `sealWithRecoveryCode(vaultKey: string, code: string): Promise<WrappedKey>` and `openWithRecoveryCode(copy: WrappedKey, code: string): Promise<string | null>`. They reuse `sealWithPassword`/`openWithPassword` on the code with dashes and spaces removed and upper-cased, so a typed code with mixed case still works.
  - `createKeyPair(vaultKey: string): Promise<{ publicKey: string; privateKeySealed: string }>`. X25519 from `react-native-quick-crypto` `generateKeyPair`, public key as base64 SPKI DER, private key PKCS8 DER sealed with AES-GCM under the vault key (`expo-crypto`), base64.

- [ ] **Step 1: Write failing tests:**
  - `deriveAccountPassword` returns the same value for `" Me@X.com "` and `"me@x.com"`, and a different one for another email. Mock `argon2` with a deterministic stand-in, as other tests mock native modules.
  - `createRecoveryCode()` matches `/^([A-HJ-NP-Z2-9]{4}-){5}[A-HJ-NP-Z2-9]{4}$/`.
  - `openWithRecoveryCode(await sealWithRecoveryCode(key, code), code.toLowerCase().replaceAll("-", " "))` equals `key`; a different code gives `null`.
- [ ] **Step 2:** Run `npx jest src/features/sync/account-keys.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement `account-keys.ts`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 3: Local outbox (schema version 4)

**Files:**
- Modify: `src/data/vault-database.ts` (`SCHEMA_VERSION = 4`, `upgradeSchema`, `saveChanges`, `writeAutofillLink`, `deleteAutofillLink`)
- Create: `src/features/sync/outbox.ts`, `src/features/sync/outbox.test.ts`

**Interfaces:**
- Produces tables, added in `fromVersion < 4`:
  - `sync_outbox(kind TEXT NOT NULL, id TEXT NOT NULL, PRIMARY KEY (kind, id))`
  - `sync_revisions(kind TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY (kind, id))`
  - `sync_state` rows in `vault_settings`: `sync.lastRevision`.
- Produces `getOutboxEntries(folderChanges: ItemChanges<Folder>, credentialChanges: ItemChanges<Credential>): { kind: SyncKind; id: string }[]` in `outbox.ts`. Saved and deleted ids both become entries. Whether an entry is a deletion is decided at upload time by whether the row still exists.
- Produces `type SyncKind = "folder" | "credential" | "link"` and `linkId(target: string, credentialId: string): string`, which returns `${credentialId}|${target}`.
- `saveChanges` inserts the entries with `INSERT OR IGNORE INTO sync_outbox` in the same transaction. Link write and delete insert `("link", linkId(...))`.

- [ ] **Step 1: Write failing tests** for `getOutboxEntries`: a renamed folder gives `[{kind:"folder", id}]`; a deleted credential gives `[{kind:"credential", id}]`; a folder whose only change is its position gives an entry (order syncs too).
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement `outbox.ts` and the schema change. Recording into the outbox happens even with sync off, so turning sync on can upload everything. On first sign-in, Task 7 fills the outbox with every row anyway.
- [ ] **Step 4:** Run all tests: PASS. On the phone with a development build, open an existing vault and check it still opens (upgrade from 3 to 4).
- [ ] **Step 5:** Commit.

### Task 4: Item encoding and conflict rules

**Files:**
- Create: `src/features/sync/sync-items.ts`, `src/features/sync/sync-items.test.ts`, `src/features/sync/sync-merge.ts`, `src/features/sync/sync-merge.test.ts`

**Interfaces:**
- Produces in `sync-items.ts`:
  - `type ServerItem = { id: string; kind: SyncKind; revision: number; deleted: boolean; data: string | null }`
  - `type PlainItem = { kind: "folder"; folder: Folder; position: number } | { kind: "credential"; credential: Credential; position: number } | { kind: "link"; target: string; credentialId: string }`
  - `encryptItem(item: PlainItem, vaultKey: string): Promise<string>`: JSON then AES-GCM, base64 combined.
  - `decryptItem(id: string, kind: SyncKind, data: string, vaultKey: string): Promise<PlainItem | null>`. Returns null when decryption or the shape check fails.
- Produces in `sync-merge.ts`:
  - `type MergeAction = { type: "upsert"; item: PlainItem } | { type: "delete"; kind: SyncKind; id: string } | { type: "keepConflictCopy"; credential: Credential } | { type: "skip" }`
  - `mergeRemote(local: PlainItem | undefined, localChanged: boolean, remote: PlainItem | null, remoteDeleted: boolean): MergeAction[]`

- [ ] **Step 1: Write failing tests** for `mergeRemote`, one per rule:
  - local unchanged → remote upsert wins; remote deleted → delete.
  - both changed credential, remote `updatedAt` later → `[upsert remote, keepConflictCopy local]`.
  - both changed credential, local later → `[keepConflictCopy remote]`, and the local version is uploaded again later.
  - equal `updatedAt` → the version whose JSON string sorts later wins, so every device picks the same one.
  - local edited, remote deleted → `[]`; the local edit stays and re-uploads. This is the Review Focus delete-vs-edit case.
  - both changed folder → newer wins, no copy.
  - remote `null` (undecryptable) → `[{type:"skip"}]`.
- [ ] **Step 2:** Tests for `encryptItem`/`decryptItem`: a round trip equals the input; corrupted `data` gives null. Mock `expo-crypto` AES with a reversible stand-in.
- [ ] **Step 3:** Run: FAIL. Implement. Run: PASS.
- [ ] **Step 4:** Commit.

### Task 5: Sync engine

**Files:**
- Create: `src/features/sync/sync-server.ts` (interface only in this task), `src/features/sync/sync-engine.ts`, `src/features/sync/sync-engine.test.ts`

**Interfaces:**
- Produces in `sync-server.ts`:
  ```ts
  export interface SyncServer {
    push(vaultId: string, items: (ServerItem & { baseRevision: number })[]): Promise<{ revisions: Record<string, number>; conflicts: ServerItem[] }>;
    pull(vaultId: string, sinceRevision: number, limit: number): Promise<ServerItem[]>;
  }
  ```
- Produces in `sync-engine.ts`:
  ```ts
  export type LocalSyncStore = {
    readOutbox(): { kind: SyncKind; id: string }[];
    readItem(kind: SyncKind, id: string): PlainItem | undefined;
    readRevision(kind: SyncKind, id: string): number;   // 0 when never synced
    applyActions(actions: MergeAction[], revisions: { kind: SyncKind; id: string; revision: number }[]): void; // one transaction
    clearOutbox(entries: { kind: SyncKind; id: string }[]): void;
    lastRevision(): number;
    setLastRevision(revision: number): void;
  };
  export type SyncResult = { uploaded: number; downloaded: number; conflicts: number; undecryptable: string[] };
  export function syncOnce(store: LocalSyncStore, server: SyncServer, vaultId: string, vaultKey: string): Promise<SyncResult>;
  ```
- Order inside `syncOnce`: read the outbox → encrypt → `push` → write the returned revisions and clear only the pushed entries → resolve `conflicts` through `mergeRemote` → `pull` in pages of 500 until a short page → merge → `setLastRevision`. Each page is applied in one transaction. Undecryptable items are skipped and listed, and `lastRevision` does not move past them, so they are retried.

- [ ] **Step 1: Write failing tests** with an in-memory fake `SyncServer` and `LocalSyncStore`:
  - two stores syncing through one fake server converge on the same folders, credentials and links;
  - a sync that throws after `push` (fake throws in `pull`) leaves no duplicates, and the next `syncOnce` completes (Review Focus: interrupted sync);
  - an outbox entry added during a sync (between push and clear) is not cleared;
  - an undecryptable pulled item is reported in `undecryptable`, local data is untouched, and the next sync pulls it again;
  - 1,200 remote items arrive in 3 pages.
- [ ] **Step 2:** Run: FAIL. Implement. Run: PASS.
- [ ] **Step 3:** Commit.

### Task 6: Supabase adapter and session

**Files:**
- Create: `src/features/sync/supabase-client.ts`, and the Supabase class in `src/features/sync/sync-server.ts`
- Modify: `app.json` → `expo.extra.supabaseUrl`, `expo.extra.supabaseAnonKey` (dev project values; the anon key is public by design)

**Interfaces:**
- Produces `supabase` (a `SupabaseClient` with `auth.storage` = `expo-sqlite/kv-store`'s `Storage`, `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`).
- Produces `createSupabaseSyncServer(client: SupabaseClient): SyncServer`. `push` calls `client.rpc("push_items", …)`; `pull` selects `items` where `vault_id = ? and revision > ?`, ordered by revision, limited.
- Produces `fetchAccountKeys(): Promise<AccountKeysRow | null>` and `saveAccountKeys(row: AccountKeysRow): Promise<void>`, where `AccountKeysRow` mirrors the table from Task 1 in camelCase.

- [ ] **Step 1:** `npx expo install @supabase/supabase-js`. Read the Supabase "Expo React Native" quickstart for the client options in use today, and follow it where it differs from this task.
- [ ] **Step 2:** Extend the Task 1 integration test: `createSupabaseSyncServer` pushes and pulls a fake item for a signed-in test user, and `saveAccountKeys` then `fetchAccountKeys` returns the same row.
- [ ] **Step 3:** Run with the env vars: FAIL. Implement. Run: PASS.
- [ ] **Step 4:** Update `SECURITY.md`: the account session token is stored unencrypted in app-private storage; it reaches the account, not the vault.
- [ ] **Step 5:** Commit.

### Task 7: Accounts, first upload and the recovery code

**Files:**
- Create: `src/app/account.tsx`, `src/features/sync/sync-context.tsx`, `src/features/sync/sync-settings.ts`, `src/features/sync/sync-settings.test.ts`
- Modify: `src/app/_layout.tsx` (`SyncProvider` inside `VaultProvider`; `account` and `sync` screens), `src/app/settings.tsx` (Sync row next to Backup), `src/data/vault-context.tsx` (expose `db`, `vaultKey` and `onVaultChanged` to `SyncProvider` only, via a new `useVaultInternals()`), `src/i18n/en.ts`, `src/i18n/tr.ts`, `FEATURES.md`, `SECURITY.md`

**Interfaces:**
- Produces `useSync(): { account: { email: string } | null; signUpWithEmail(email: string, masterPassword: string): Promise<{ recoveryCode: string }>; signInWithEmail(email: string, masterPassword: string): Promise<"ok" | "wrong">; signInWithGoogle(): Promise<"ok" | "cancelled">; signOut(deleteServerCopy: boolean): Promise<void>; syncNow(): Promise<SyncResult | "offline" | "signed-out">; isSyncing: boolean; lastSyncedAt: number | null; settings: SyncSettings; setSettings(next: SyncSettings): void }`
- Produces in `sync-settings.ts`: `type SyncFrequency = "live" | "15min" | "hourly" | "daily"`, `type SyncSettings = { auto: boolean; frequency: SyncFrequency }` (default `{ auto: true, frequency: "live" }`), `readSyncSettings()`, `writeSyncSettings()`, and `getIntervalMs(frequency): number | null`, where `live` gives null and the others give 15, 60 and 1,440 minutes.
- Sign-up: create the Supabase user with `deriveAccountPassword` as its password, create the `vaults` row, `createKeyPair`, seal password and recovery copies, `saveAccountKeys`, put every local row in the outbox, `syncNow()`.
- Google: `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } })` opened with `WebBrowser.openAuthSessionAsync`. The `redirectTo` comes from `Linking.createURL("auth")` with the `passwordmanager` scheme. Set up the Google provider in the dashboard. A new Google account continues like sign-up. An existing one fetches `account_keys` and asks for the master password.
- Sign-in on a phone that already has a local vault with different data: unlock the server vault key with the master password, then merge the local items into it as new uploads. Never replace local data.
- The recovery code screen shows the code once, with Copy and "I wrote it down". It cannot be closed by Back until that is tapped.

- [ ] **Step 1:** Tests for `sync-settings.ts`: defaults when nothing is stored, `getIntervalMs` values, unknown stored values fall back to defaults.
- [ ] **Step 2:** Run: FAIL. Implement. Run: PASS.
- [ ] **Step 3:** Build `SyncProvider`, `account.tsx` (Google button, email + master password, create or sign in) and the Settings row. Signed out, it opens `/account`; signed in, `/sync`.
- [ ] **Step 4:** `npx expo install expo-web-browser`. This package was removed in the cleanup and is needed again for Google. It is a native change, so this task is tested in the Task 11 build.
- [ ] **Step 5:** Manual test on the dev project with email sign-up: the recovery code appears, rows exist in `items`, and their `data` is unreadable base64.
- [ ] **Step 6:** Docs, then commit.

### Task 8: Sync screen, triggers and live updates

**Files:**
- Create: `src/app/sync.tsx`
- Modify: `src/features/sync/sync-context.tsx`, `src/features/autofill/autofill-root.tsx` (sync after unlock, before the list; push after save), `src/i18n/en.ts`, `src/i18n/tr.ts`, `FEATURES.md`

**Interfaces:**
- Consumes `useSync()` from Task 7 and `syncOnce` from Task 5.
- Triggers when `settings.auto`: on unlock; 3 seconds after `onVaultChanged` (debounced); on `AppState` active; every `getIntervalMs(frequency)` while unlocked; for `live`, a Supabase Realtime `postgres_changes` subscription on `items` filtered by `vault_id`, which calls `syncNow()`. Subscribe on unlock, unsubscribe on lock and on background.
- The autofill window has no `SyncProvider`. It calls `syncOnce` directly with `createSupabaseSyncServer(supabase)` when a session exists, with a 5-second timeout. On timeout it shows the local list.

- [ ] **Step 1:** Build `sync.tsx`: email, the Auto sync switch, frequency as a `ChoiceDialog`, Sync now with "Last synced …" and an `ActivityIndicator`, the number of items that could not be decrypted (from `SyncResult.undecryptable`) when it is above 0, and Sign out (asks whether to delete the server copy). When Supabase reports an expired or revoked session, `syncNow` returns `"signed-out"`, and the screen asks to sign in again without touching local data. Add `"signed-out"` to the `syncNow` return type in Task 7.
- [ ] **Step 2:** Add the triggers and the Realtime subscription.
- [ ] **Step 3:** Manual test with two development builds or an emulator: an edit on one appears on the other within about 2 seconds with Live; with Hourly it appears on Sync now; with auto off nothing moves until Sync now.
- [ ] **Step 4:** Docs, then commit.

### Task 9: Recovery code and unlocked-device reset

**Files:**
- Create: `src/app/recover.tsx`
- Modify: `src/data/vault-context.tsx` (`changeMasterPassword` also replaces the server password copy and, for email accounts, calls `supabase.auth.updateUser({ password: newAccountPassword })`), `src/features/lock/unlock-screen.tsx` ("Forgot master password?" link when an account exists), i18n, `FEATURES.md`

**Interfaces:**
- Consumes `openWithRecoveryCode`, `deriveAccountPassword` and `saveAccountKeys`.
- Produces `recoverWithCode(email: string, code: string, newMasterPassword: string): Promise<"ok" | "wrong-code">`. It works for email accounts without the old account password: an edge function action `reset-account-password` checks a proof (an HMAC of the email under the vault key) against `account_keys.recovery_proof`, a new column added in this task's migration, before setting the new account password with the service role.

- [ ] **Step 1: Failing test** in `account-keys.test.ts`: `createRecoveryProof(vaultKey, email)` is stable, and differs for another key.
- [ ] **Step 2:** Implement. Add the migration column. Add the edge function action, deployed with `npx supabase functions deploy account-recovery`.
- [ ] **Step 3:** Manual test (Review Focus: master password change): change the master password on phone A, then unlock phone B with the new one after a sync. Recover with the code on a fresh install.
- [ ] **Step 4:** Docs, then commit.

### Task 10: Recover with my account

**Files:**
- Modify: `supabase/functions/account-recovery/index.ts` (actions `enable`, `disable`, `start`, `cancel`, `finish`), the `src/app/sync.tsx` switch, `src/app/recover.tsx`, i18n, `FEATURES.md`, `SECURITY.md`

**Interfaces:**
- `enable`: the client sends the vault key over TLS. The function encrypts it with AES-GCM under the `RECOVERY_ESCROW_KEY` secret and stores `account_recovery.escrow`. `disable` deletes the row.
- `start`: creates a `recovery_requests` row and emails the owner a cancel link. Email goes through Resend, with its key in the `RESEND_API_KEY` secret.
- `cancel?token=`: marks the request cancelled.
- `finish`: only when `now() - requested_at >= interval '3 days'`, not cancelled and not finished. It returns the decrypted vault key once and marks the request finished. The app then asks for a new master password, saves a new password copy, and for email accounts runs the reset from Task 9.

- [ ] **Step 1:** Integration test, with env vars: `finish` before 3 days returns HTTP 425 and no key; after a cancelled request, `finish` returns 410.
- [ ] **Step 2:** Implement, deploy, then run: PASS. Shorten the wait for this test only, with a `RECOVERY_WAIT_SECONDS` secret on the dev project.
- [ ] **Step 3:** The switch text spells out the trade-off from the spec. Add the matching `SECURITY.md` entry.
- [ ] **Step 4:** Commit.

### Task 11: Locked-device downloads, background sync and the build

**Files:**
- Create: `src/features/sync/download-queue.ts`, `src/features/sync/download-queue.test.ts`, `src/features/sync/background-sync.ts`
- Modify: `src/features/sync/sync-engine.ts` (`syncOnce` first drains the queue), `app.json` (plugins), `index.ts` (register the task at startup), `FEATURES.md` and its Android version table

**Interfaces:**
- Produces `appendToQueue(items: ServerItem[]): void`, `takeQueue(): ServerItem[]`, `queuedRevision(): number`. The queue is stored in `Paths.document/sync-queue.json`; its items are already encrypted.
- Produces `registerBackgroundSync(frequency: SyncFrequency | null): Promise<void>`, using `expo-background-task` with `minimumInterval` in minutes (15, 60 or 1,440; live uses 15). Null unregisters. The task only pulls into the queue, using the stored session. It never needs the vault key.

- [ ] **Step 1: Failing tests:** queue round trip; `takeQueue` empties it; a corrupt file reads as empty and does not throw.
- [ ] **Step 2:** Run: FAIL. Implement. Run: PASS.
- [ ] **Step 3:** `npx expo install expo-background-task expo-task-manager`. Read their v58 docs for Android setup.
- [ ] **Step 4:** Build a development build: `npx eas-cli@latest build --platform android --profile development`. Run the manual tests from Tasks 7–10. On Android, force the task with `adb shell cmd jobscheduler run -f com.ibrahimturna.passwordmanager <job id>` (look up the exact command in the `expo-background-task` docs), and check that queued items merge at the next unlock.
- [ ] **Step 5:** Docs, `npx expo-doctor`, then commit. A preview build follows when the user decides to release.
