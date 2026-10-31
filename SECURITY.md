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
- Backup files are encrypted the same way, with the master password at the time of the backup. Making one needs the phone lock when that is on, otherwise the master password. Temporary copies made for sharing are deleted afterwards.

- Autofill never reads the vault until the user passes the phone lock or master password, on every fill or save. Its window is always blocked from screenshots, and uses a separate database connection that closes straight after.
- A login offered for saving stays in the app's memory, not in the intent, until the user finishes or leaves.

## Accepted risks

These are deliberate trade-offs, not oversights.

- **Over-the-air updates can change the app's code.** The app installs JavaScript published to its EAS update channel, so whoever holds the Expo account or its `EXPO_TOKEN` could ship code that reads an unlocked vault. Updates are not code-signed yet. Vault data itself never leaves the phone, and this affects the installed app only through that one channel.

- **Autofill trusts app names and browsers.** An app is recognised by its package name, without checking its signature. A website address is only accepted from a fixed list of browsers, so other apps cannot claim to be a website, but a listed browser's report is believed. The first link is always chosen by the user, who sees the app or website name. Websites are matched by site, so every subdomain of a site shares its links, except across public suffixes such as github.io.
- **Autofill offer titles are not encrypted.** The offer appears before unlocking, so each remembered login's password title is kept in the app's private storage, outside the vault, so that someone with access to that storage learns which logins exist. Usernames and passwords are never kept there. Titles are removed when the password is deleted, the next time the vault is opened.

- **No recovery.** A forgotten master password can only be replaced from an unlocked vault, or by unlocking with the phone lock. There is no recovery code or cloud copy.
- **Backups are manual.** Uninstalling the app or losing the phone loses everything since the last backup file. Restoring also needs the master password used when that backup was made.
- **A backup file can be attacked offline.** Anyone who gets the file can try passwords on their own computer. Argon2id slows this down, but a weak master password is still at risk.
- **Weak passwords are allowed.** Any non-empty master password is accepted.
- **The master password is readable once unlocked.** It is stored inside the encrypted vault so Settings can show it. Anyone who passes the phone lock can read or replace it.
- **The phone lock is an app-level check.** Android's SecureStore authentication accepts only strong biometrics, so to allow PIN and pattern the app checks the lock itself. On a rooted phone this check can be bypassed.
- **Drafts stay in memory while locked.** Half-filled forms (including passwords) and search text are kept in memory so they return after unlocking. They are never written to disk and disappear when Android closes the app.
- **The clipboard can outlive the timer.** Android stops the app's timers in the background, so a password copied before leaving the app is only cleared on return. If the user never returns, it stays until replaced or removed by Android.
- **Keyboards can keep their own copy.** Samsung Keyboard kept a copied password in its own clipboard history in testing, even though the app marks it sensitive and clears the system clipboard. The app cannot reach that history.
- **Settings are not encrypted.** They are stored outside the vault, including the screenshot setting.
- **Screenshot blocking is limited.** It stops captures of the app's window, not a camera pointed at the screen.
