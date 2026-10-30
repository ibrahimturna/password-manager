import * as Clipboard from "expo-clipboard";

// Copies a password to the clipboard. Every copy in the app goes through here.
// Marked sensitive: Android 13+ then hides it in the clipboard preview, and keyboards
// do not suggest it. Milestone 8 will also clear the clipboard after a short time.
export async function copyPassword(password: string): Promise<void> {
  await Clipboard.setStringAsync(password, { android: { isSensitive: true } });
}
