import { StyleSheet } from "react-native";

import type { Palette } from "@/theme/colors";

// The look shared by the setup and unlock screens.
export function createLockStyles(colors: Palette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      gap: 12,
      backgroundColor: colors.surface,
    },
    title: {
      fontSize: 24,
      fontWeight: "600",
      color: colors.onSurface,
    },
    message: {
      fontSize: 15,
      color: colors.onSurfaceVariant,
    },
    label: {
      marginTop: 8,
      color: colors.onSurfaceVariant,
    },
    error: {
      color: colors.error,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 8,
    },
    switchLabel: {
      flex: 1,
      fontSize: 15,
      color: colors.onSurface,
    },
    primaryButton: {
      marginTop: 12,
      paddingVertical: 12,
      alignItems: "center",
      borderRadius: 24,
      backgroundColor: colors.primary,
    },
    primaryText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
    secondaryButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    secondaryText: {
      fontSize: 16,
      color: colors.primary,
    },
  });
}
