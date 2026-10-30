import { Stack } from "expo-router";

import { VaultProvider } from "@/data/vault-context";
import { ExpandedCategoriesProvider } from "@/features/categories/expanded-categories-context";

export default function RootLayout() {
  return (
    // Every screen inside the providers shares the same vault data and open/closed tree state.
    <VaultProvider>
      <ExpandedCategoriesProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: "Password Manager" }} />
          <Stack.Screen
            name="category-form"
            options={{ title: "Category", presentation: "modal" }}
          />
        </Stack>
      </ExpandedCategoriesProvider>
    </VaultProvider>
  );
}
