import { createContext, useContext, useState, type ReactNode } from "react";
import Storage from "expo-sqlite/kv-store";

import { AUTO_LOCK_SETTINGS, type AutoLockSetting } from "@/features/lock/lock-rules";

import { parseSetting } from "./settings-values";

// "device" means: follow the phone's own setting.
const LANGUAGE_SETTINGS = ["device", "tr", "en"] as const;
const THEME_SETTINGS = ["device", "light", "dark"] as const;
export type LanguageSetting = (typeof LANGUAGE_SETTINGS)[number];
export type ThemeSetting = (typeof THEME_SETTINGS)[number];
const SCREEN_CAPTURE_SETTINGS = ["blocked", "allowed"] as const;
export type ScreenCaptureSetting = (typeof SCREEN_CAPTURE_SETTINGS)[number];
const RECENTS_SETTINGS = ["hidden", "shown"] as const;
export type RecentsSetting = (typeof RECENTS_SETTINGS)[number];

const LANGUAGE_KEY = "settings.language";
const THEME_KEY = "settings.theme";
const AUTO_LOCK_KEY = "settings.autoLock";
const SCREEN_CAPTURE_KEY = "settings.screenCapture";
const RECENTS_KEY = "settings.recents";

type SettingsValue = {
  language: LanguageSetting;
  theme: ThemeSetting;
  autoLock: AutoLockSetting;
  screenCapture: ScreenCaptureSetting;
  recents: RecentsSetting;
  setLanguage: (language: LanguageSetting) => void;
  setTheme: (theme: ThemeSetting) => void;
  setAutoLock: (autoLock: AutoLockSetting) => void;
  setScreenCapture: (screenCapture: ScreenCaptureSetting) => void;
  setRecents: (recents: RecentsSetting) => void;
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
  const [screenCapture, setScreenCaptureState] = useState(() =>
    parseSetting(Storage.getItemSync(SCREEN_CAPTURE_KEY), SCREEN_CAPTURE_SETTINGS, "blocked"),
  );
  const [recents, setRecentsState] = useState(() =>
    parseSetting(Storage.getItemSync(RECENTS_KEY), RECENTS_SETTINGS, "hidden"),
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

  function setScreenCapture(next: ScreenCaptureSetting) {
    setScreenCaptureState(next);
    Storage.setItemSync(SCREEN_CAPTURE_KEY, next);
  }

  function setRecents(next: RecentsSetting) {
    setRecentsState(next);
    Storage.setItemSync(RECENTS_KEY, next);
  }

  return (
    <SettingsContext
      value={{
        language,
        theme,
        autoLock,
        screenCapture,
        recents,
        setLanguage,
        setTheme,
        setAutoLock,
        setScreenCapture,
        setRecents,
      }}
    >
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
