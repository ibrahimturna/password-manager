import { useLocales } from "expo-localization";

import { useSettings } from "@/features/settings/settings-context";

import { en, type Translations } from "./en";
import { resolveLanguage, type Language } from "./language";
import { tr } from "./tr";

const translations: Record<Language, Translations> = { en, tr };

// Returns the texts for the current language. Use it as `const t = useTranslation();`
// and then `t.home.collapseAll`.
// useLocales re-renders when the phone's language changes, so "device" stays up to date.
export function useTranslation(): Translations {
  const { language } = useSettings();
  const [deviceLocale] = useLocales();
  return translations[resolveLanguage(language, deviceLocale.languageCode)];
}
