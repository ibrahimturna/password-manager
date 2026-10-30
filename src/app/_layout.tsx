import { Stack } from "expo-router";

import { VaultProvider } from "@/data/vault-context";
import { ExpandedCategoriesProvider } from "@/features/categories/expanded-categories-context";
import { SettingsButton } from "@/features/settings/settings-button";
import { SettingsProvider } from "@/features/settings/settings-context";
import { useTranslation } from "@/i18n/use-translation";

export default function RootLayout() {
  return (
    // Every screen inside the providers shares the same settings, vault data and open/closed tree state.
    <SettingsProvider>
      <VaultProvider>
        <ExpandedCategoriesProvider>
          <AppStack />
        </ExpandedCategoriesProvider>
      </VaultProvider>
    </SettingsProvider>
  );
}

// A separate component because the header titles need the current language,
// and useTranslation only works inside <SettingsProvider>.
function AppStack() {
  const t = useTranslation();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: t.app.title, headerRight: () => <SettingsButton /> }}
      />
      <Stack.Screen
        name="category-form"
        options={{ title: t.categoryForm.title, presentation: "modal" }}
      />
      <Stack.Screen name="settings" options={{ title: t.settings.title }} />
    </Stack>
  );
}
