# Cloud sync: design

Status: approved in conversation on 2026-11-06, waiting for review of this written version.

This is the first of three projects:

1. **Sync foundation** (this document): accounts, keys, the server, and sync on the phone.
2. **Browser extension**: Chrome first, then Firefox and other Chromium browsers. Decisions already made for it are listed at the end.
3. **Desktop app**: later.

Family sharing and two-factor sign-in are separate later projects. This design leaves room for family sharing.

## Goals

- Optional: the phone app stays local-only, exactly as today, until the user signs in.
- End-to-end encrypted: the server stores only encrypted data, except for users who turn on account recovery.
- Nothing is lost: turning sync on keeps the current vault and its key. Nothing is re-encrypted or wiped.
- Works offline: the local database stays the main copy on every device.

## Accounts

- Sign in with Google, or with an email and password created in the app's own form. Supabase Auth handles both.
- The account sign-in and the vault unlock are separate. Signing in proves who the user is. The master password still unlocks the vault on each device.
- With email accounts, the account password is not the master password. See "Keys".

## Keys

- **Vault key**: the same random key the phone already uses. It encrypts every item.
- **Master password**: Argon2id on the device, with the existing settings, gives a password key. It never leaves the device and only unlocks the vault key.
- **Account password for email sign-up**: a separate value derived on the device from the master password with a different salt and purpose. It is what Supabase receives, so the server never sees anything that can unlock the vault.
- **Key pair**: every account gets a public and private key at sign-up. The private key is encrypted with the vault key. Family sharing uses it later.

The server stores these encrypted copies of the vault key:

| Copy | Locked with | Present for |
| --- | --- | --- |
| Password copy | Password key | Every account |
| Recovery-code copy | Key from the recovery code | Every account |
| Account-recovery copy | A server-side secret (not in the database) | Only accounts with "Recover with my account" on |

## Recovery

- **Recovery code**: shown once at sign-up, to write down. It unlocks the vault key, and the user sets a new master password. The device then replaces the password copy.
- **Unlocked device**: a device that is still signed in and unlocked already has the vault key, so it can set a new master password the same way.
- **Recover with my account** (opt-in switch, off by default):
  1. Turning it on stores the account-recovery copy.
  2. A user who forgot everything signs in with Google or email and starts recovery.
  3. After a 3-day waiting period, with an email that lets the real owner cancel it, a server function unlocks that copy and the user sets a new master password.
  4. The switch explains, in plain words, that with it on the server operator, a server breach, or a stolen Google account (after the wait) could read the vault.
- Without the switch, losing the master password, the recovery code and every device loses the data.

## Server data

One Supabase Postgres table, `items`, with row-level security so an account only reaches its own vaults:

| Column | Meaning |
| --- | --- |
| `id` | The item's id, the same as on the phone |
| `vault_id` | The vault it belongs to. Today only the personal vault; later family vaults |
| `kind` | `folder`, `credential` or `link` |
| `revision` | A number that goes up with every change, set by the server |
| `deleted` | True for deleted items, so deletions reach other devices |
| `data` | The encrypted contents (AES-GCM with the vault key) |

Encrypted: titles, usernames, passwords, website addresses, folder names and order. Visible to the server: number of items, their kind, and when they changed.

Other tables hold the accounts' encrypted key copies, public keys and recovery requests.

## Sync

On each device, every item gets two local values: the revision it last synced at, and whether it changed locally since. Adding them is a normal schema upgrade (version 3 to 4). Nothing is deleted.

One sync:

1. Upload items changed locally.
2. Download items with a newer revision than the device last saw.
3. Merge them into the local vault.

**Conflicts**: each upload says which revision the device last saw. When the server already has a newer one, both devices changed the item:

- The version with the later edit time (the item's `updatedAt`) wins.
- For a password, the other version is kept as a copy in a "Sync conflicts" folder, so nothing is lost.
- For a folder, the other version (a name or a position) is dropped; folders hold no secrets to lose.
- Links have no versions: a link exists or is deleted, and a deletion wins only over the link it saw.

**Locked devices**: only an unlocked device has the vault key. A locked device can still download items, which stay encrypted, into a local queue. They are merged at the next unlock. The queue holds only encrypted data, so it is safe outside the encrypted database.

## When sync happens

With auto sync on:

- Right after every change, including logins saved through the autofill window.
- When the app opens, and right after unlocking in the autofill window, before it shows the password list.
- While unlocked, checking for other devices' changes at the chosen frequency.
- In the background, downloading into the encrypted queue at the chosen frequency.

| Frequency | While unlocked | In the background |
| --- | --- | --- |
| Live (default) | Supabase Realtime, within about a second | About every 15 minutes |
| Every 15 minutes | Every 15 minutes | About every 15 minutes |
| Hourly | Hourly | About hourly |
| Daily | Daily | About daily |

With auto sync off, only **Sync now** syncs.

Android limits: background jobs run at most every 15 minutes, at times Android chooses, and Samsung battery saving can delay them. Opening the app or filling a login always syncs at once, so this only affects how early items are downloaded. Background sync needs a native module, so it ships with a new build. Everything else is JavaScript.

## Settings

- A **Sync** row next to Backup and restore.
- Signed out: it opens the account screen with "Continue with Google", "Sign in with email" and "Create account".
- Signed in: it opens the Sync screen with the email, the auto sync switch, the frequency, "Sync now" with the last sync time and a spinner, the "Recover with my account" switch, and "Sign out".
- Turning sync on uploads the current vault. Signing out keeps everything on the phone and asks whether to also delete the server copy.

## Errors

- No connection: changes stay marked and sync later. "Sync now" shows that it could not connect.
- Signed out on the server (expired session): the Sync screen asks to sign in again. Local data is untouched.
- An item that cannot be decrypted (for example corrupted): it is skipped, kept in the queue, and reported on the Sync screen. It never replaces local data.

## Testing

- Unit tests for the pure parts: key derivation inputs, merge and conflict rules, revision tracking, the frequency rules.
- A local Supabase instance for the server functions and row-level security.
- Phone tests for sign-up, first upload, two devices editing the same item, offline changes, recovery code, and the 3-day account recovery.

## Not in this project

- The browser extension, the desktop app, family sharing, two-factor sign-in.
- Sharing passwords with anyone outside one's own account.

## Decisions for the browser extension

- Chrome first, from one TypeScript Manifest V3 codebase that also covers Firefox and other Chromium browsers.
- It fills logins without asking again while unlocked, like Chrome's own password manager.
- It locks when the browser closes (default), after 15 minutes or 1 hour idle, or when the computer locks. "Never lock" is not offered, because it would leave the vault key unprotected on disk.
- Unlock with the master password, a PIN (only until the browser closes), or Windows Hello through WebAuthn's PRF feature. Windows Hello support in Chrome and Firefox must be checked before it is promised.
- The same sync rules and frequencies apply. Its background timer can run at most about once a minute.
