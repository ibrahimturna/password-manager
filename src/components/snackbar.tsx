import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

type SnackbarProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
  // Distance from the bottom of the screen, so the bar can sit above other buttons.
  bottom: number;
};

// A short message bar at the bottom of the screen with one action, like Material's Snackbar.
// The screen decides when to show and hide it.
export function Snackbar({ message, actionLabel, onAction, bottom }: SnackbarProps) {
  const styles = createStyles(useTheme().colors);

  return (
    // "polite" makes Android's screen reader read the message when it appears.
    <View style={[styles.container, { bottom }]} accessibilityLiveRegion="polite">
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
        <Text style={styles.action}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      left: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 4,
      backgroundColor: colors.surfaceContainerHigh,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      elevation: 6, // Android shadow
    },
    message: {
      flex: 1,
      color: colors.onSurface,
      fontSize: 15,
    },
    action: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
