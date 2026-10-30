import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import type { TreeRow } from "./category-tree";
import { getRowKey, ReadOnlyTreeRow } from "./category-tree-list";

type DeleteCategoryDialogProps = {
  visible: boolean;
  // Everything that will be deleted, as read-only tree rows.
  rows: TreeRow[];
  onCancel: () => void;
  onConfirm: () => void;
};

// Asks before deleting a category, and shows everything that will be deleted with it.
// A dialog (not a screen), because it is a quick yes/no decision.
export function DeleteCategoryDialog({ visible, rows, onCancel, onConfirm }: DeleteCategoryDialogProps) {
  const t = useTranslation();
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
          <Text style={styles.title}>{t.deleteCategory.title}</Text>
          <Text style={styles.message}>{t.deleteCategory.willDelete}</Text>

          <FlatList
            data={rows}
            keyExtractor={getRowKey}
            renderItem={({ item }) => <ReadOnlyTreeRow row={item} />}
            style={styles.preview}
            contentContainerStyle={styles.previewContent}
          />

          <View style={styles.buttons}>
            <Pressable onPress={onCancel} style={styles.button} accessibilityRole="button">
              <Text style={styles.cancelText}>{t.deleteCategory.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[styles.button, styles.deleteButton]}
              accessibilityRole="button"
            >
              <Text style={styles.deleteText}>{t.deleteCategory.confirm}</Text>
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
      maxHeight: "80%", // a long preview scrolls inside the card
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
    preview: {
      flexGrow: 0, // only as tall as its content
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: 12,
      // Same colour as the card; the border alone marks the preview area.
      backgroundColor: colors.surfaceContainerHigh,
    },
    previewContent: {
      paddingHorizontal: 12,
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
    deleteButton: {
      backgroundColor: colors.error,
    },
    deleteText: {
      fontSize: 16,
      color: colors.onError,
    },
  });
}
