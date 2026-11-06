import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  // Extra content between the message and the buttons, e.g. a preview.
  children?: ReactNode;
  // False draws the confirm button in the normal colour, for questions that remove nothing.
  isDestructive?: boolean;
};

// A yes/no question in a Material 3 style dialog, drawn in the app's theme.
// The confirm button is red by default, because this is mostly used before deleting things.
export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  children,
  isDestructive = true,
}: ConfirmDialogProps) {
  const styles = createStyles(useTheme().colors);

  return (
    <Modal
      visible={visible}
      transparent // we draw our own dimmed background
      animationType="fade"
      onRequestClose={onCancel} // Android back button
      statusBarTranslucent // dim the status bar and navigation bar too (Android)
      navigationBarTranslucent
    >
      <View style={styles.centered}>
        {/* The dimmed background. It is a sibling of the card, not its parent, so a tap on
            the card never reaches it; only taps outside the card cancel. */}
        <Pressable style={styles.scrim} onPress={onCancel} accessible={false} />

        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {children}

          <View style={styles.buttons}>
            <Pressable onPress={onCancel} style={styles.button} accessibilityRole="button">
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[styles.button, isDestructive ? styles.confirmButton : styles.primaryButton]}
              accessibilityRole="button"
            >
              <Text style={isDestructive ? styles.confirmText : styles.primaryText}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
    },
    scrim: {
      position: "absolute", // covers the whole screen, behind the card
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      // Material 3's scrim: black at 32%, the same in light and dark themes.
      backgroundColor: "rgba(0, 0, 0, 0.32)",
    },
    // Material 3 dialog: raised surface, large rounded corners.
    card: {
      maxHeight: "80%", // long content scrolls inside the card
      padding: 24,
      gap: 16,
      borderRadius: 28,
      backgroundColor: colors.surfaceContainerHigh,
      elevation: 6, // Android shadow
    },
    title: {
      fontSize: 22,
      color: colors.onSurface,
    },
    message: {
      fontSize: 15,
      color: colors.onSurfaceVariant,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
    },
    cancelText: {
      fontSize: 16,
      color: colors.primary,
    },
    confirmButton: {
      backgroundColor: colors.error,
    },
    confirmText: {
      fontSize: 16,
      color: colors.onError,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    primaryText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
  });
}
