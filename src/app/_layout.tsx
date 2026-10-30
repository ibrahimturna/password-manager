import { Stack } from "expo-router";

import { VaultProvider } from "@/data/vault-context";

export default function RootLayout() {
  return (
    // Every screen inside the provider shares the same vault data.
    <VaultProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Password Manager" }} />
      </Stack>
    </VaultProvider>
  );
}
