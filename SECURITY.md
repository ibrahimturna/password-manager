# Security notes

A local-only Android password manager. Nothing leaves the phone.

## How the vault is protected

- The database is encrypted with SQLCipher using a random vault key.
- The vault key is stored locked with a key derived from the master password (Argon2id, 64 MiB, 3 passes, then AES-GCM).
- With the phone lock on, a second copy sits in SecureStore and is read after the phone's biometrics or PIN/pattern succeed.
- Locking closes the database and removes the decrypted vault from the screens.
- Screenshots are blocked and the app is blank in recent apps by default. Allowing them is a setting, and needs the phone lock when that is in use.
- A copied password is marked sensitive and removed from the clipboard after 30 seconds.
- Android backup is turned off.

## Accepted risks

These are deliberate trade-offs, not oversights.

- **No recovery.** A forgotten master password can only be replaced from an unlocked vault, or by unlocking with the phone lock. There is no recovery code or cloud copy.
- **No backup.** Uninstalling the app or losing the phone loses the vault.
- **Weak passwords are allowed.** Any non-empty master password is accepted.
- **The master password is readable once unlocked.** It is stored inside the encrypted vault so Settings can show it. Anyone who passes the phone lock can read or replace it.
- **The phone lock is an app-level check.** Android's SecureStore authentication accepts only strong biometrics, so to allow PIN and pattern the app checks the lock itself. On a rooted phone this check can be bypassed.
- **Drafts stay in memory while locked.** Half-filled forms (including passwords) and search text are kept in memory so they return after unlocking. They are never written to disk and disappear when Android closes the app.
- **The clipboard can outlive the timer.** Android stops the app's timers in the background, so a password copied before leaving the app is only cleared on return. If the user never returns, it stays until replaced or removed by Android.
- **Keyboards can keep their own copy.** Samsung Keyboard kept a copied password in its own clipboard history in testing, even though the app marks it sensitive and clears the system clipboard. The app cannot reach that history.
- **Settings are not encrypted.** They are stored outside the vault, including the screenshot setting.
- **Screenshot blocking is limited.** It stops captures of the app's window, not a camera pointed at the screen.
