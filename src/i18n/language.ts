import type { LanguageSetting } from "@/features/settings/settings-context";

// The languages the app has texts for.
export type Language = "tr" | "en";

// Turns the user's setting into the language to show.
// "device" uses the phone's language when the app has it, and English otherwise.
// `deviceLanguageCode` is like "tr" or "en"; the phone may not report one (null).
export function resolveLanguage(
  setting: LanguageSetting,
  deviceLanguageCode: string | null,
): Language {
  if (setting !== "device") {
    return setting;
  }
  return deviceLanguageCode === "tr" ? "tr" : "en";
}
