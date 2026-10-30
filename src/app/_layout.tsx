import { Stack } from "expo-router";

import { VaultProvider } from "@/data/vault-context";
import { ExpandedCategoriesProvider } from "@/features/categories/expanded-categories-context";
import { SettingsButton } from "@/features/settings/settings-button";
import { SettingsProvider } from "@/features/settings/settings-context";

export default function RootLayout() {
  return (
    // Every screen inside the providers shares the same settings, vault data and open/closed tree state.
    <SettingsProvider>
      <VaultProvider>
        <ExpandedCategoriesProvider>
          <Stack>
            <Stack.Screen
              name="index"
              options={{ title: "Password Manager", headerRight: () => <SettingsButton /> }}
            />
            <Stack.Screen
              name="category-form"
              options={{ title: "Category", presentation: "modal" }}
            />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
          </Stack>
        </ExpandedCategoriesProvider>
      </VaultProvider>
    </SettingsProvider>
  );
}
