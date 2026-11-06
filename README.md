# Password Manager

A local-only password manager for Android, built with Expo and React Native. The vault is encrypted on the phone, nothing is sent to a server, and it fills logins in other apps and browsers through Android's autofill framework.

Built as a learning and portfolio project. The full feature list, in English and Turkish, is in [FEATURES.md](FEATURES.md). The security design and the accepted risks are in [SECURITY.md](SECURITY.md).

## Highlights

- **Encrypted vault.** SQLCipher database, opened with a random vault key. The key is locked with an Argon2id key from the master password, and optionally a second copy behind the phone's biometrics, PIN or pattern.
- **Autofill in other apps.** A native Kotlin autofill service fills logins in apps and browsers, offers to save new ones, and remembers which password belongs to which app or website. Every fill asks for the phone lock or the master password first.
- **Folders.** Nested folders shown as an expandable tree, with search, reordering by drag, Undo after deleting, and multi-select to merge or delete passwords.
- **Encrypted backups.** Backup files are encrypted the same way. Restoring never deletes anything and asks about every password that differs.
- **Hardening.** Copied passwords are cleared after 30 seconds, screenshots are blocked by default, the app is hidden in recent apps, Android backup is off, and the vault locks after leaving the app.
- **Updates without a new APK.** Every push to `master` publishes an over-the-air update. The app asks before installing it.
- **English and Turkish, light and dark themes.**

## Tech stack

| Area | What it uses |
| --- | --- |
| App | Expo SDK 58, React Native 0.88, React 19, TypeScript (strict) |
| Navigation | Expo Router, with file-based routes in `src/app/` |
| Storage | `expo-sqlite` with SQLCipher |
| Keys and crypto | `react-native-quick-crypto` (Argon2id, AES-GCM), `expo-secure-store`, `expo-local-authentication` |
| Autofill | A local Expo module in Kotlin, `modules/password-autofill/` |
| Drag and drop | `react-native-reorderable-list` |
| Tests | Jest with `jest-expo` |
| Builds and updates | EAS Build, EAS Update, GitHub Actions |

## How the code is organised

```text
src/
  app/          Screens. Every file is a route, _layout.tsx sets up the providers and the stack.
  components/   Shared UI: dialogs, switches, settings rows, icons, password input.
  data/         The vault repository: rules in memory, SQLite saving, React context.
  features/     One folder per feature: autofill, backup, credentials, folders, lock,
                search, settings, undo. Pure logic lives next to its tests.
  i18n/         English and Turkish texts. TypeScript reports missing or extra texts.
  theme/        Colour palettes for the light and dark themes.
modules/
  password-autofill/   Kotlin autofill service, autofill window and the JavaScript bridge.
```

Screens never touch the database directly. They call the vault context, which calls a repository. The repository keeps all the rules in memory, and the SQLite version writes only what changed, in one transaction.

## Running it

You need Node.js, an Android phone or emulator, and an [Expo](https://expo.dev) account for builds.

The app uses native code (SQLCipher and the autofill service), so it does not run in Expo Go. It needs a development build:

```bash
npm install
npx eas-cli@latest build --platform android --profile development
```

Install the APK on the phone, then start the development server:

```bash
npx expo start
```

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx jest
```

## Releases and updates

- `preview` builds an installable APK on EAS: `npx eas-cli@latest build --platform android --profile preview`.
- Every push to `master` runs `.github/workflows/update.yml`. It typechecks, runs the tests and publishes an Android update to the `preview` channel. It needs an `EXPO_TOKEN` repository secret.
- Updates are matched by a native fingerprint, so JavaScript changes reach installed apps, but changes to native code or native packages need a new build.
- The app checks on start and asks before installing. **Settings → App version** checks again.

## License

See [LICENSE](LICENSE).
