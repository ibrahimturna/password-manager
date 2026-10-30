export type ClipboardAction = "clear" | "retry" | "leave";

// Decides what to do when a copied password's time is up.
// Android hides the clipboard (an empty read) until the app has focus again, which comes a
// moment after returning to it, so an empty read is worth another try.
export function getClipboardAction(
  clipboardText: string,
  password: string,
  triesLeft: number,
): ClipboardAction {
  if (clipboardText === password) return "clear";
  // Anything else was copied by the user afterwards, and is not ours to remove.
  if (clipboardText !== "") return "leave";
  return triesLeft > 1 ? "retry" : "leave";
}
