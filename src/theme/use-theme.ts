import { useColorScheme } from "react-native";

import { useSettings } from "@/features/settings/settings-context";

import { resolveColorScheme, type ColorScheme } from "./color-scheme";
import { darkColors, lightColors, type Palette } from "./colors";

type Theme = {
  scheme: ColorScheme;
  colors: Palette;
};

// Returns the active colours. Use it as `const { colors } = useTheme();`.
// useColorScheme re-renders when the phone switches between light and dark.
export function useTheme(): Theme {
  const { theme } = useSettings();
  const scheme = resolveColorScheme(theme, useColorScheme());
  return { scheme, colors: scheme === "dark" ? darkColors : lightColors };
}
