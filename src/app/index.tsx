import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { Snackbar } from "@/components/snackbar";
import { useVault } from "@/data/vault-context";
import { getCategoryById, getSubtreeRows, type TreeRow } from "@/features/categories/category-tree";
import { CategoryTreeList } from "@/features/categories/category-tree-list";
import { DeleteCategoryDialog } from "@/features/categories/delete-category-dialog";
import { useExpandedCategories } from "@/features/categories/expanded-categories-context";
import { copyPassword } from "@/features/credentials/copy-password";
import { useUndo } from "@/features/undo/undo-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const FLOATING_BUTTON_SIZE = 56;
// How long a copy button shows a check mark after copying.
const COPIED_FEEDBACK_MS = 2000;

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
  // Whether the "+" button's menu (New password / New category) is open.
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  // The credential whose password was just copied; its copy icon shows a check for a moment.
  const [copiedCredentialId, setCopiedCredentialId] = useState<string | null>(null);

  // The category the delete dialog asks about, with its preview rows.
  // Kept after the dialog closes, so the dialog does not go blank while it fades out.
  const [deleteTarget, setDeleteTarget] = useState<{
    category: { id: string; name: string };
    rows: TreeRow[];
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { pendingUndo, offerUndo, runUndo, dismissUndo } = useUndo();

  const hasExpanded = expandedIds.size > 0;

  function toggleMenu(categoryId: string) {
    setMenuCategoryId((current) => (current === categoryId ? null : categoryId));
  }

  // Closes whichever menu is open (a row's "⋮" actions or the "+" menu).
  function closeMenu() {
    setMenuCategoryId(null);
    setIsAddMenuOpen(false);
  }

  function openCredentialForm(params: { credentialId?: string; categoryId?: string }) {
    closeMenu();
    router.push({ pathname: "/credential-form", params });
  }

  async function copyCredentialPassword(credentialId: string) {
    const credential = credentials.find((item) => item.id === credentialId);
    if (credential === undefined) return;
    await copyPassword(credential.password);
    setCopiedCredentialId(credentialId);
    // Screen readers cannot see the check mark, so they hear this instead.
    AccessibilityInfo.announceForAccessibility(t.tree.copied);
  }

  // Turns the check mark back into the copy icon after a moment.
  useEffect(() => {
    if (copiedCredentialId === null) return;
    const timer = setTimeout(() => setCopiedCredentialId(null), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copiedCredentialId]);

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
    offerUndo(t.deleteCategory.deleted(deleteTarget.category.name), () =>
      restoreDeletion(deletion),
    );
  }

  // The returned function runs when this screen loses focus (another screen opens on top),
  // so a menu is never left open behind the form or the settings screen.
  // An older Undo also ends there: the vault can only change on another screen, so Undo always
  // restores into exactly the state the delete left behind. (A password deleted on the form
  // screen offers its Undo after this cleanup has already run, so that Undo survives.)
  useFocusEffect(
    useCallback(() => {
      return () => {
        setMenuCategoryId(null);
        setIsAddMenuOpen(false);
        dismissUndo();
      };
    }, [dismissUndo]),
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
        copiedCredentialId={copiedCredentialId}
        onToggleCategory={toggleCategory}
        onToggleMenu={toggleMenu}
        onCloseMenu={closeMenu}
        onAddPassword={(categoryId) => openCredentialForm({ categoryId })}
        onAddSubcategory={(parentId) =>
          router.push({ pathname: "/category-form", params: { mode: "create", categoryId: parentId } })
        }
        onRenameCategory={(categoryId) =>
          router.push({ pathname: "/category-form", params: { mode: "rename", categoryId } })
        }
        onDeleteCategory={openDeleteDialog}
        onOpenCredential={(credentialId) => openCredentialForm({ credentialId })}
        onCopyCredential={copyCredentialPassword}
      />

      {pendingUndo !== null && (
        <Snackbar
          message={pendingUndo.message}
          action={{ label: t.deleteCategory.undo, onPress: runUndo }}
          // Sits above the round button, as Material recommends.
          bottom={insets.bottom + 16 + FLOATING_BUTTON_SIZE + 12}
        />
      )}

      {/* The "+" menu: two labelled choices above the round button. */}
      {isAddMenuOpen && (
        <View
          style={[styles.addMenu, { bottom: insets.bottom + 16 + FLOATING_BUTTON_SIZE + 12 }]}
        >
          <AddMenuItem
            icon="newPassword"
            label={t.home.newPassword}
            onPress={() => openCredentialForm({})}
          />
          <AddMenuItem
            icon="newFolder"
            label={t.home.newCategory}
            onPress={() => {
              closeMenu();
              router.push("/category-form");
            }}
          />
        </View>
      )}

      <Pressable
        onPress={() => {
          setMenuCategoryId(null);
          setIsAddMenuOpen((open) => !open);
        }}
        style={[styles.floatingButton, { bottom: insets.bottom + 16 }]}
        accessibilityRole="button"
        accessibilityLabel={isAddMenuOpen ? t.home.closeAddMenu : t.home.addButton}
        accessibilityState={{ expanded: isAddMenuOpen }}
      >
        <Icon
          name={isAddMenuOpen ? "close" : "add"}
          color={colors.onPrimaryContainer}
          size={28}
        />
      </Pressable>

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
    addMenu: {
      position: "absolute",
      right: 16,
      alignItems: "flex-end",
      gap: 12,
    },
    addMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 28,
      backgroundColor: colors.primaryContainer,
      elevation: 3, // Android shadow
    },
    addMenuText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.onPrimaryContainer,
    },
  });
}

// One labelled choice in the "+" menu.
function AddMenuItem({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable onPress={onPress} style={styles.addMenuItem} accessibilityRole="button">
      <Icon name={icon} color={colors.onPrimaryContainer} size={22} />
      <Text style={styles.addMenuText}>{label}</Text>
    </Pressable>
  );
}
