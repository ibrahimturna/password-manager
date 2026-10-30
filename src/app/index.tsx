import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Snackbar } from "@/components/snackbar";
import { useVault } from "@/data/vault-context";
import type { CategoryDeletion } from "@/features/categories/category-mutations";
import { getCategoryById, getSubtreeRows, type TreeRow } from "@/features/categories/category-tree";
import { CategoryTreeList } from "@/features/categories/category-tree-list";
import { DeleteCategoryDialog } from "@/features/categories/delete-category-dialog";
import { useExpandedCategories } from "@/features/categories/expanded-categories-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const FLOATING_BUTTON_SIZE = 56;
// How long a delete can be undone.
const UNDO_DURATION_MS = 5000;

export default function HomeScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { categories, credentials, deleteCategory, restoreDeletion } = useVault();
  const { expandedIds, toggleCategory, collapseAll, forgetCategories } = useExpandedCategories();
  // Keeps the round button above Android's navigation bar.
  const insets = useSafeAreaInsets();
  // The category whose "⋮" actions are open, or null. Only one at a time.
  const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null);

  // The category the delete dialog asks about, with its preview rows.
  // Kept after the dialog closes, so the dialog does not go blank while it fades out.
  const [deleteTarget, setDeleteTarget] = useState<{
    category: { id: string; name: string };
    rows: TreeRow[];
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // The last delete, while it can still be undone.
  const [pendingUndo, setPendingUndo] = useState<{
    deletion: CategoryDeletion;
    name: string;
  } | null>(null);

  const hasExpanded = expandedIds.size > 0;

  function toggleMenu(categoryId: string) {
    setMenuCategoryId((current) => (current === categoryId ? null : categoryId));
  }

  function closeMenu() {
    setMenuCategoryId(null);
  }

  function openDeleteDialog(categoryId: string) {
    const category = getCategoryById(categories, categoryId);
    if (category === undefined) return;
    setDeleteTarget({ category, rows: getSubtreeRows(categories, credentials, categoryId) });
    setIsDeleteDialogOpen(true);
  }

  function confirmDelete() {
    setIsDeleteDialogOpen(false);
    if (deleteTarget === null) return;

    const deletion = deleteCategory(deleteTarget.category.id);
    // Deleted categories must not stay in the open/closed state.
    forgetCategories(deletion.categories.map((removed) => removed.item.id));
    setPendingUndo({ deletion, name: deleteTarget.category.name });
  }

  function undoDelete() {
    if (pendingUndo === null) return;
    restoreDeletion(pendingUndo.deletion);
    setPendingUndo(null);
  }

  // Ends the Undo chance after a few seconds. A new delete restarts the timer; the cleanup
  // function cancels the old timer so it cannot end the new Undo early.
  useEffect(() => {
    if (pendingUndo === null) return;
    const timer = setTimeout(() => setPendingUndo(null), UNDO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [pendingUndo]);

  // The returned function runs when this screen loses focus (another screen opens on top),
  // so a menu is never left open behind the form or the settings screen.
  // Undo also ends there: the vault can only change on another screen, so Undo always
  // restores into exactly the state the delete left behind.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setMenuCategoryId(null);
        setPendingUndo(null);
      };
    }, []),
  );

  return (
    // Any tap that no button inside takes (text, credential rows, empty space) closes the menu.
    // Buttons inside win because React Native gives a tap to the innermost pressable element.
    <Pressable style={styles.container} onPress={closeMenu} accessible={false}>
      <Text style={styles.notice}>{t.home.mockNotice}</Text>

      <Pressable
        onPress={() => {
          closeMenu();
          collapseAll();
        }}
        disabled={!hasExpanded}
        style={styles.collapseButton}
        accessibilityRole="button"
      >
        <Icon
          name="collapseAll"
          color={hasExpanded ? colors.primary : colors.disabledContent}
          size={20}
        />
        <Text style={[styles.collapseText, !hasExpanded && styles.disabledText]}>
          {t.home.collapseAll}
        </Text>
      </Pressable>

      <CategoryTreeList
        expandedIds={expandedIds}
        menuCategoryId={menuCategoryId}
        onToggleCategory={toggleCategory}
        onToggleMenu={toggleMenu}
        onCloseMenu={closeMenu}
        onAddSubcategory={(parentId) =>
          router.push({ pathname: "/category-form", params: { mode: "create", categoryId: parentId } })
        }
        onRenameCategory={(categoryId) =>
          router.push({ pathname: "/category-form", params: { mode: "rename", categoryId } })
        }
        onDeleteCategory={openDeleteDialog}
      />

      <Pressable
        onPress={() => router.push("/category-form")}
        style={[styles.floatingButton, { bottom: insets.bottom + 16 }]}
        accessibilityRole="button"
        accessibilityLabel={t.home.newCategoryButton}
      >
        <Icon name="add" color={colors.onPrimaryContainer} size={28} />
      </Pressable>

      {pendingUndo !== null && (
        <Snackbar
          message={t.deleteCategory.deleted(pendingUndo.name)}
          actionLabel={t.deleteCategory.undo}
          onAction={undoDelete}
          // Sits above the round button, as Material recommends.
          bottom={insets.bottom + 16 + FLOATING_BUTTON_SIZE + 12}
        />
      )}

      <DeleteCategoryDialog
        visible={isDeleteDialogOpen}
        rows={deleteTarget?.rows ?? []}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
      />
    </Pressable>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      gap: 12,
    },
    notice: {
      textAlign: "center",
      color: colors.onSurfaceVariant,
    },
    collapseButton: {
      alignSelf: "flex-end",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
    },
    collapseText: {
      color: colors.primary,
      fontSize: 16,
    },
    disabledText: {
      color: colors.disabledContent,
    },
    floatingButton: {
      position: "absolute",
      right: 16,
      width: FLOATING_BUTTON_SIZE,
      height: FLOATING_BUTTON_SIZE,
      borderRadius: FLOATING_BUTTON_SIZE / 2, // half the size makes a circle
      backgroundColor: colors.primaryContainer,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4, // Android shadow
    },
  });
}
