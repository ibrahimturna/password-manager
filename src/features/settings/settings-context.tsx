import { createContext, useContext, useState, type ReactNode } from "react";
import Storage from "expo-sqlite/kv-store";

import { AUTO_LOCK_SETTINGS, type AutoLockSetting } from "@/features/lock/lock-rules";

import { parseSetting } from "./settings-values";

// "device" means: follow the phone's own setting.
const LANGUAGE_SETTINGS = ["device", "tr", "en"] as const;
const THEME_SETTINGS = ["device", "light", "dark"] as const;
export type LanguageSetting = (typeof LANGUAGE_SETTINGS)[number];
export type ThemeSetting = (typeof THEME_SETTINGS)[number];

const LANGUAGE_KEY = "settings.language";
const THEME_KEY = "settings.theme";
const AUTO_LOCK_KEY = "settings.autoLock";

type SettingsValue = {
  language: LanguageSetting;
  theme: ThemeSetting;
  autoLock: AutoLockSetting;
  setLanguage: (language: LanguageSetting) => void;
  setTheme: (theme: ThemeSetting) => void;
  setAutoLock: (autoLock: AutoLockSetting) => void;
};

const SettingsContext = createContext<SettingsValue | null>(null);

// Holds the user's app settings and remembers them between app starts.
// They are not secret, so they use a simple key-value store outside the encrypted vault.
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(() =>
    parseSetting(Storage.getItemSync(LANGUAGE_KEY), LANGUAGE_SETTINGS, "device"),
  );
  const [theme, setThemeState] = useState(() =>
    parseSetting(Storage.getItemSync(THEME_KEY), THEME_SETTINGS, "device"),
  );
  const [autoLock, setAutoLockState] = useState(() =>
    parseSetting(Storage.getItemSync(AUTO_LOCK_KEY), AUTO_LOCK_SETTINGS, "1min"),
  );

  function setLanguage(next: LanguageSetting) {
    setLanguageState(next);
    Storage.setItemSync(LANGUAGE_KEY, next);
  }

  function setTheme(next: ThemeSetting) {
    setThemeState(next);
    Storage.setItemSync(THEME_KEY, next);
  }

  function setAutoLock(next: AutoLockSetting) {
    setAutoLockState(next);
    Storage.setItemSync(AUTO_LOCK_KEY, next);
  }

  return (
    <SettingsContext value={{ language, theme, autoLock, setLanguage, setTheme, setAutoLock }}>
      {children}
    </SettingsContext>
  );
}

export function useSettings(): SettingsValue {
  const settings = useContext(SettingsContext);
  if (settings === null) {
    throw new Error("useSettings must be used inside <SettingsProvider>.");
  }
  return settings;
}
