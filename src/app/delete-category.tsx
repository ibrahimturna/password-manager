import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useVault } from "@/data/vault-context";
import { getSubtreeRows } from "@/features/categories/category-tree";
import { getRowKey, ReadOnlyTreeRow } from "@/features/categories/category-tree-list";
import { useDeleteUndo } from "@/features/categories/delete-undo-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

// Asks before deleting a category, and shows everything that will be deleted with it.
// Opened from a row's "⋮" actions with `categoryId`.
export default function DeleteCategoryScreen() {
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);
  const insets = useSafeAreaInsets();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { categories, credentials } = useVault();
  const { deleteCategoryWithUndo } = useDeleteUndo();

  // Taken once, when the screen opens. After "Delete" the category is gone from the vault,
  // but this screen stays visible for a moment while it closes; it should keep its content.
  const [rows] = useState(() =>
    categoryId === undefined ? [] : getSubtreeRows(categories, credentials, categoryId),
  );

  function confirmDelete() {
    if (categoryId !== undefined && rows.length > 0) {
      deleteCategoryWithUndo(categoryId);
    }
    router.back();
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.heading}>{t.deleteCategory.willDelete}</Text>

      <FlatList
        data={rows}
        keyExtractor={getRowKey}
        renderItem={({ item }) => <ReadOnlyTreeRow row={item} />}
        style={styles.preview}
        contentContainerStyle={styles.previewContent}
      />

      <View style={styles.buttons}>
        <Pressable onPress={() => router.back()} style={styles.button} accessibilityRole="button">
          <Text style={styles.cancelText}>{t.deleteCategory.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          style={[styles.button, styles.deleteButton]}
          accessibilityRole="button"
        >
          <Text style={styles.deleteText}>{t.deleteCategory.confirm}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      gap: 12,
    },
    heading: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.onSurface,
    },
    // The preview sits in a bordered box, so it reads as "a copy of the tree", not as the tree itself.
    preview: {
      flexGrow: 0, // only as tall as its content; scrolls when the subtree is long
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
    },
    previewContent: {
      paddingHorizontal: 12,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: "auto", // pushes the buttons to the bottom of the screen
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
