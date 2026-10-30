import { createContext, useContext, useState, type ReactNode } from "react";

// "device" means: follow the phone's own setting.
export type LanguageSetting = "device" | "tr" | "en";
export type ThemeSetting = "device" | "light" | "dark";

type SettingsValue = {
  language: LanguageSetting;
  theme: ThemeSetting;
  setLanguage: (language: LanguageSetting) => void;
  setTheme: (theme: ThemeSetting) => void;
};

const SettingsContext = createContext<SettingsValue | null>(null);

// Holds the user's app settings.
// Not saved yet: both go back to "device" when the app restarts. Saving comes with storage (Milestone 6).
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageSetting>("device");
  const [theme, setTheme] = useState<ThemeSetting>("device");

  return (
    <SettingsContext value={{ language, theme, setLanguage, setTheme }}>
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
