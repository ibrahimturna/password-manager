import * as Clipboard from "expo-clipboard";

import { getClipboardAction } from "./clipboard-rules";

const CLEAR_AFTER_MS = 30_000;
const RETRY_AFTER_MS = 500;
const MAX_CLEAR_TRIES = 4;

// The waiting timer. A newer copy replaces it.
let clearTimer: ReturnType<typeof setTimeout> | null = null;

// Android stops JavaScript timers while the app is in the background, so a timer that ends
// there fires when the user returns. If they never return, the password stays on the clipboard.
async function clearClipboard(password: string, triesLeft: number) {
  const action = getClipboardAction(await Clipboard.getStringAsync(), password, triesLeft);
  if (action === "clear") {
    await Clipboard.setStringAsync("", { android: { isSensitive: true } });
  } else if (action === "retry") {
    clearTimer = setTimeout(() => void clearClipboard(password, triesLeft - 1), RETRY_AFTER_MS);
  }
}

// Copies a password to the clipboard. Every copy in the app goes through here.
// Marked sensitive: Android 13+ then hides it in the clipboard preview, and keyboards
// do not suggest it. It is cleared after a short time.
export async function copyPassword(password: string): Promise<void> {
  await Clipboard.setStringAsync(password, { android: { isSensitive: true } });
  if (clearTimer !== null) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => void clearClipboard(password, MAX_CLEAR_TRIES), CLEAR_AFTER_MS);
}
