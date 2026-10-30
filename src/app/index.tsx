import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { Snackbar } from "@/components/snackbar";
import { useVault } from "@/data/vault-context";
import {
  getFolderById,
  getSubtreeRows,
  toggleExpanded,
  type TreeRow,
} from "@/features/folders/folder-tree";
import { FolderTreeList } from "@/features/folders/folder-tree-list";
import { DeleteFolderDialog } from "@/features/folders/delete-folder-dialog";
import { useExpandedFolders } from "@/features/folders/expanded-folders-context";
import { copyPassword } from "@/features/credentials/copy-password";
import { searchVault } from "@/features/search/search";
import { useUndo } from "@/features/undo/undo-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const FLOATING_BUTTON_SIZE = 56;
const SEARCH_BUTTON_SIZE = 44;
const BUTTON_GAP = 12;
// How long a copy button shows a check mark after copying.
const COPIED_FEEDBACK_MS = 2000;

export default function HomeScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { folders, credentials, deleteFolder, restoreDeletion } = useVault();
  const { expandedIds, toggleFolder, collapseAll, forgetFolders } = useExpandedFolders();
  // Keeps the round button above Android's navigation bar.
  const insets = useSafeAreaInsets();
  // The folder whose "⋮" actions are open, or null. Only one at a time.
  const [menuFolderId, setMenuFolderId] = useState<string | null>(null);
  // Whether the "+" button's menu (New password / New folder) is open.
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  // The credential whose password was just copied; its copy icon shows a check for a moment.
  const [copiedCredentialId, setCopiedCredentialId] = useState<string | null>(null);

  // The folder the delete dialog asks about, with its preview rows.
  // Kept after the dialog closes, so the dialog does not go blank while it fades out.
  const [deleteTarget, setDeleteTarget] = useState<{
    folder: { id: string; name: string };
    rows: TreeRow[];
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { pendingUndo, offerUndo, runUndo, dismissUndo } = useUndo();

  // Search. The results are the normal tree, cut down to the matches (see searchVault).
  // React Native 0.88 types a TextInput ref with TextInputInstance (it has .focus()).
  const searchInputRef = useRef<TextInputInstance>(null);
  const [query, setQuery] = useState("");
  // Open/closed folders while searching. Separate from the normal tree's state, so clearing
  // the search brings the tree back exactly as it was.
  const [searchExpandedIds, setSearchExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const search = searchVault(folders, credentials, query);
  const isSearching = search !== null;

  const shownExpandedIds = isSearching ? searchExpandedIds : expandedIds;
  const hasExpanded = shownExpandedIds.size > 0;

  function changeQuery(text: string) {
    closeMenu();
    setQuery(text);
    // Every new query starts with the folders opened down to its matches.
    setSearchExpandedIds(searchVault(folders, credentials, text)?.expandedIds ?? new Set());
  }

  function toggleShownFolder(folderId: string) {
    if (isSearching) {
      setSearchExpandedIds((current) => toggleExpanded(current, folderId, folders));
    } else {
      toggleFolder(folderId);
    }
  }

  function collapseShownFolders() {
    if (isSearching) {
      setSearchExpandedIds(new Set());
    } else {
      collapseAll();
    }
  }

  // The search button puts the cursor in the search field, which opens the keyboard.
  function focusSearch() {
    closeMenu();
    searchInputRef.current?.focus();
  }

  function toggleMenu(folderId: string) {
    setMenuFolderId((current) => (current === folderId ? null : folderId));
  }

  // Closes whichever menu is open (a row's "⋮" actions or the "+" menu).
  function closeMenu() {
    setMenuFolderId(null);
    setIsAddMenuOpen(false);
  }

  function openCredentialForm(params: { credentialId?: string; folderId?: string }) {
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

  function openDeleteDialog(folderId: string) {
    const folder = getFolderById(folders, folderId);
    if (folder === undefined) return;
    setDeleteTarget({ folder, rows: getSubtreeRows(folders, credentials, folderId) });
    setIsDeleteDialogOpen(true);
  }

  function confirmDelete() {
    setIsDeleteDialogOpen(false);
    if (deleteTarget === null) return;

    const deletion = deleteFolder(deleteTarget.folder.id);
    // Deleted folders must not stay in the open/closed state (normal or search).
    const deletedIds = deletion.folders.map((removed) => removed.item.id);
    forgetFolders(deletedIds);
    setSearchExpandedIds((current) => {
      const next = new Set(current);
      for (const id of deletedIds) next.delete(id);
      return next;
    });
    offerUndo(t.deleteFolder.deleted(deleteTarget.folder.name), () =>
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
        setMenuFolderId(null);
        setIsAddMenuOpen(false);
        dismissUndo();
      };
    }, [dismissUndo]),
  );

  return (
    // Any tap that no button inside takes (text, credential rows, empty space) closes the menu.
    // Buttons inside win because React Native gives a tap to the innermost pressable element.
    <Pressable
      style={styles.container}
      onPress={() => {
        closeMenu();
        Keyboard.dismiss();
      }}
      accessible={false}
    >
      <View style={styles.searchField}>
        <Icon name="search" color={colors.onSurfaceVariant} size={22} />
        <TextInput
          ref={searchInputRef}
          value={query}
          onChangeText={changeQuery}
          placeholder={t.home.searchPlaceholder}
          placeholderTextColor={colors.onSurfaceVariant}
          selectionColor={colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          importantForAutofill="no"
          // The border is on the wrapper, so the input's own style never changes.
          style={styles.searchInput}
          accessibilityLabel={t.home.searchButton}
        />
        {query !== "" && (
          <Pressable
            onPress={() => changeQuery("")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t.home.clearSearch}
          >
            <Icon name="close" color={colors.onSurfaceVariant} size={22} />
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => {
          closeMenu();
          collapseShownFolders();
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

      <FolderTreeList
        expandedIds={shownExpandedIds}
        filter={search ?? undefined}
        emptyText={isSearching ? t.tree.noResults(query.trim()) : t.tree.noFolders}
        menuFolderId={menuFolderId}
        copiedCredentialId={copiedCredentialId}
        onToggleFolder={toggleShownFolder}
        onToggleMenu={toggleMenu}
        onCloseMenu={closeMenu}
        onAddPassword={(folderId) => openCredentialForm({ folderId })}
        onAddSubfolder={(parentId) =>
          router.push({ pathname: "/folder-form", params: { mode: "create", folderId: parentId } })
        }
        onRenameFolder={(folderId) =>
          router.push({ pathname: "/folder-form", params: { mode: "rename", folderId } })
        }
        onDeleteFolder={openDeleteDialog}
        onOpenCredential={(credentialId) => openCredentialForm({ credentialId })}
        onCopyCredential={copyCredentialPassword}
      />

      {pendingUndo !== null && (
        <Snackbar
          message={pendingUndo.message}
          action={{ label: t.deleteFolder.undo, onPress: runUndo }}
          // Sits above the round buttons, as Material recommends.
          bottom={
            insets.bottom + 16 + FLOATING_BUTTON_SIZE + BUTTON_GAP + SEARCH_BUTTON_SIZE + BUTTON_GAP
          }
        />
      )}

      {/* The small search button above "+". Hidden while the "+" menu uses that space. */}
      {!isAddMenuOpen && (
        <Pressable
          onPress={focusSearch}
          style={[
            styles.searchButton,
            { bottom: insets.bottom + 16 + FLOATING_BUTTON_SIZE + BUTTON_GAP },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t.home.searchButton}
        >
          <Icon name="search" color={colors.onSecondaryContainer} size={22} />
        </Pressable>
      )}

      {/* The "+" menu: two labelled choices above the round button. */}
      {isAddMenuOpen && (
        <View
          style={[
            styles.addMenu,
            { bottom: insets.bottom + 16 + FLOATING_BUTTON_SIZE + BUTTON_GAP },
          ]}
        >
          <AddMenuItem
            icon="newPassword"
            label={t.home.newPassword}
            onPress={() => openCredentialForm({})}
          />
          <AddMenuItem
            icon="newFolder"
            label={t.home.newFolder}
            onPress={() => {
              closeMenu();
              router.push("/folder-form");
            }}
          />
        </View>
      )}

      <Pressable
        onPress={() => {
          setMenuFolderId(null);
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

      <DeleteFolderDialog
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
    searchField: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 28, // pill shape, like Material 3's search bar
      backgroundColor: colors.surfaceContainer,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.onSurface,
    },
    searchButton: {
      position: "absolute",
      // Centred above the larger "+" button.
      right: 16 + (FLOATING_BUTTON_SIZE - SEARCH_BUTTON_SIZE) / 2,
      width: SEARCH_BUTTON_SIZE,
      height: SEARCH_BUTTON_SIZE,
      borderRadius: SEARCH_BUTTON_SIZE / 2,
      backgroundColor: colors.secondaryContainer,
      alignItems: "center",
      justifyContent: "center",
      elevation: 3, // Android shadow
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
