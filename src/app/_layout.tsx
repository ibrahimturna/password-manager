import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { VaultProvider } from "@/data/vault-context";
import { ExpandedFoldersProvider } from "@/features/folders/expanded-folders-context";
import { useRestoreRoutes } from "@/features/lock/use-kept-state";
import { UpdatePrompt } from "@/features/settings/app-update";
import { ScreenCaptureGuard } from "@/features/settings/screen-capture-guard";
import { SettingsButton } from "@/features/settings/settings-button";
import { SettingsProvider } from "@/features/settings/settings-context";
import { UndoProvider } from "@/features/undo/undo-context";
import { useTranslation } from "@/i18n/use-translation";
import { useTheme } from "@/theme/use-theme";

export default function RootLayout() {
  return (
    // Every screen inside the providers shares the same settings, vault data, open/closed
    // tree state and pending Undo.
    <GestureHandlerRootView style={styles.root}>
      <SettingsProvider>
        <ScreenCaptureGuard>
          <ExpandedFoldersProvider>
            <VaultProvider>
              <UndoProvider>
                <AppStack />
              </UndoProvider>
            </VaultProvider>
          </ExpandedFoldersProvider>
        </ScreenCaptureGuard>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

// A separate component because the header titles and colours need the current settings,
// and those hooks only work inside <SettingsProvider>.
function AppStack() {
  const t = useTranslation();
  const { scheme, colors } = useTheme();
  const isRestoring = useRestoreRoutes();

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
      <Stack screenOptions={isRestoring ? { animation: "none" } : undefined}>
        <Stack.Screen
          name="index"
          options={{ title: t.app.title, headerRight: () => <SettingsButton /> }}
        />
        <Stack.Screen
          name="folder-form"
          options={{ title: t.folderForm.title, presentation: "modal" }}
        />
        <Stack.Screen
          name="credential-form"
          options={{ title: t.credentialForm.title, presentation: "modal" }}
        />
        <Stack.Screen
          name="autofill-links"
          options={{ title: t.autofillLinks.title, presentation: "modal" }}
        />
        <Stack.Screen
          name="merge-credentials"
          options={{ title: t.merge.title, presentation: "modal" }}
        />
        <Stack.Screen
          name="master-password"
          options={{ title: t.masterPasswordForm.title, presentation: "modal" }}
        />
        <Stack.Screen name="settings" options={{ title: t.settings.title }} />
        <Stack.Screen name="backup" options={{ title: t.backup.title }} />
      </Stack>
      <UpdatePrompt />
    </ThemeProvider>
  );
}
