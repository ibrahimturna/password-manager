import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";

import { VaultProvider } from "@/data/vault-context";
import { ExpandedCategoriesProvider } from "@/features/categories/expanded-categories-context";
import { SettingsButton } from "@/features/settings/settings-button";
import { SettingsProvider } from "@/features/settings/settings-context";
import { UndoProvider } from "@/features/undo/undo-context";
import { useTranslation } from "@/i18n/use-translation";
import { useTheme } from "@/theme/use-theme";

export default function RootLayout() {
  return (
    // Every screen inside the providers shares the same settings, vault data, open/closed
    // tree state and pending Undo.
    <SettingsProvider>
      <VaultProvider>
        <ExpandedCategoriesProvider>
          <UndoProvider>
            <AppStack />
          </UndoProvider>
        </ExpandedCategoriesProvider>
      </VaultProvider>
    </SettingsProvider>
  );
}

// A separate component because the header titles and colours need the current settings,
// and those hooks only work inside <SettingsProvider>.
function AppStack() {
  const t = useTranslation();
  const { scheme, colors } = useTheme();

  // Android shows the native "root view" behind all screens while one slides in. It was white
  // (even with the phone in dark mode), which flashed during transitions in our dark theme,
  // so we paint it with our background colour.
  // useEffect is for keeping something outside React (here: the native root view) in sync.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.surface);
  }, [colors.surface]);

  // The navigation library has its own small theme (headers, screen backgrounds).
  // We start from its light or dark version and replace the colours with ours.
  const baseTheme = scheme === "dark" ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.surface,
      card: colors.surface,
      text: colors.onSurface,
      border: colors.outlineVariant,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      {/* Dark icons on a light app, light icons on a dark app. */}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack>
        <Stack.Screen
          name="index"
          options={{ title: t.app.title, headerRight: () => <SettingsButton /> }}
        />
        <Stack.Screen
          name="category-form"
          options={{ title: t.categoryForm.title, presentation: "modal" }}
        />
        <Stack.Screen
          name="credential-form"
          options={{ title: t.credentialForm.title, presentation: "modal" }}
        />
        <Stack.Screen name="settings" options={{ title: t.settings.title }} />
      </Stack>
    </ThemeProvider>
  );
}
