import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon, type IconName } from "@/components/icon";
import { Snackbar } from "@/components/snackbar";
import { useVault } from "@/data/vault-context";
import {
  getChildFolders,
  getFolderById,
  getSubtreeRows,
  toggleExpanded,
  type TreeRow,
} from "@/features/folders/folder-tree";
import { FolderReorderList } from "@/features/folders/folder-reorder-list";
import { FolderTreeList } from "@/features/folders/folder-tree-list";
import { DeleteFolderDialog } from "@/features/folders/delete-folder-dialog";
import { useExpandedFolders } from "@/features/folders/expanded-folders-context";
import { readReminderState, shouldRemind, snoozeReminder } from "@/features/backup/backup-reminder";
import { copyPassword } from "@/features/credentials/copy-password";
import { useKeptState } from "@/features/lock/use-kept-state";
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
  const { folders, credentials, deleteFolder, restoreDeletion, deleteCredentials } = useVault();
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

  // Read again whenever this screen comes back, so a backup made meanwhile hides the card.
  const [reminder, setReminder] = useState(readReminder);
  const isReminderShown = shouldRemind(reminder.state, credentials.length, reminder.checkedAt);

  // The passwords chosen to merge or delete, or null when not selecting.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string> | null>(null);
  // Kept after the dialog closes, so its text does not change while it fades out.
  const [deleteCount, setDeleteCount] = useState(0);
  const [isDeleteSelectedOpen, setIsDeleteSelectedOpen] = useState(false);
  // The level whose folders are being reordered, or null when not reordering.
  const [reorder, setReorder] = useState<{ parentId: string | null } | null>(null);

  // Android's back button leaves these modes instead of the app.
  const isInMode = selectedIds !== null || reorder !== null;
  useEffect(() => {
    if (!isInMode) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setSelectedIds(null);
      setReorder(null);
      return true;
    });
    return () => subscription.remove();
  }, [isInMode]);

  // Unselecting the last password ends selecting.
  function toggleSelected(credentialId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(credentialId)) next.add(credentialId);
      return next.size === 0 ? null : next;
    });
  }

  function openDeleteSelected() {
    if (selectedIds === null) return;
    setDeleteCount(selectedIds.size);
    setIsDeleteSelectedOpen(true);
  }

  function confirmDeleteSelected() {
    setIsDeleteSelectedOpen(false);
    if (selectedIds === null) return;
    const undo = deleteCredentials([...selectedIds]);
    offerUndo(t.merge.deleted(selectedIds.size), undo);
    setSelectedIds(null);
  }

  // A folder with no others beside it has nothing to reorder. While searching the list is
  // incomplete, so reordering waits until the search is cleared.
  function startReorder(folderId: string) {
    const folder = getFolderById(folders, folderId);
    if (folder === undefined || isSearching || selectedIds !== null) return;
    if (getChildFolders(folders, folder.parentId).length < 2) return;
    closeMenu();
    setReorder({ parentId: folder.parentId });
  }

  function openMerge() {
    if (selectedIds === null || selectedIds.size < 2) return;
    router.push({ pathname: "/merge-credentials", params: { ids: [...selectedIds].join(",") } });
  }

  // Search. The results are the normal tree, cut down to the matches (see searchVault).
  // React Native 0.88 types a TextInput ref with TextInputInstance (it has .focus()).
  const searchInputRef = useRef<TextInputInstance>(null);
  const [query, setQuery] = useKeptState("home.query", "");
  // Open/closed folders while searching. Separate from the normal tree's state, so clearing
  // the search brings the tree back exactly as it was.
  const [searchExpandedIds, setSearchExpandedIds] = useKeptState<ReadonlySet<string>>(
    "home.searchExpandedIds",
    new Set(),
  );
  const search = searchVault(folders, credentials, query);
  const isSearching = search !== null;

  const shownExpandedIds = isSearching ? searchExpandedIds : expandedIds;
  const hasExpanded = shownExpandedIds.size > 0;
  const canReorder = !isSearching && getChildFolders(folders, null).length >= 2;

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
      setReminder(readReminder());
      return () => {
        setMenuFolderId(null);
        setIsAddMenuOpen(false);
        setSelectedIds(null);
        setReorder(null);
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
      <View style={[styles.searchField, reorder !== null && styles.hidden]}>
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

      {reorder !== null ? (
        <>
          <Text style={styles.reorderHint}>
            {reorder.parentId === null
              ? t.tree.reorderHint
              : t.tree.reorderHintIn(getFolderById(folders, reorder.parentId)?.name ?? "")}
          </Text>
          <FolderReorderList parentId={reorder.parentId} />
        </>
      ) : (
        <>
          {isReminderShown && selectedIds === null && (
            <View style={styles.reminder}>
              <Text style={styles.reminderText}>{t.backupReminder.message}</Text>
              <View style={styles.reminderButtons}>
                <Pressable
                  onPress={() => {
                    snoozeReminder();
                    setReminder(readReminder());
                  }}
                  style={styles.reminderButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.collapseText}>{t.backupReminder.later}</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/backup")}
                  style={[styles.reminderButton, styles.mainBarButton]}
                  accessibilityRole="button"
                >
                  <Text style={styles.mainBarText}>{t.backupReminder.backUp}</Text>
                </Pressable>
              </View>
            </View>
          )}
          <View style={styles.listActions}>
            {selectedIds !== null ? (
              <Pressable
                onPress={() => setSelectedIds(null)}
                style={styles.collapseButton}
                accessibilityRole="button"
              >
                <Text style={styles.collapseText}>{t.merge.cancel}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  closeMenu();
                  setReorder({ parentId: null });
                }}
                disabled={!canReorder}
                style={styles.collapseButton}
                accessibilityRole="button"
              >
                <Icon
                  name="reorder"
                  color={canReorder ? colors.primary : colors.disabledContent}
                  size={20}
                />
                <Text style={[styles.collapseText, !canReorder && styles.disabledText]}>
                  {t.home.reorder}
                </Text>
              </Pressable>
            )}
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
          </View>

          <FolderTreeList
            expandedIds={shownExpandedIds}
            filter={search ?? undefined}
            emptyText={isSearching ? t.tree.noResults(query.trim()) : t.tree.noFolders}
            menuFolderId={menuFolderId}
            copiedCredentialId={copiedCredentialId}
            selectedIds={selectedIds ?? undefined}
            onToggleSelected={toggleSelected}
            onStartSelecting={(credentialId) => setSelectedIds(new Set([credentialId]))}
            onStartReorder={startReorder}
            onToggleFolder={toggleShownFolder}
            onToggleMenu={toggleMenu}
            onCloseMenu={closeMenu}
            onAddPassword={(folderId) => openCredentialForm({ folderId })}
            onAddSubfolder={(parentId) =>
              router.push({
                pathname: "/folder-form",
                params: { mode: "create", folderId: parentId },
              })
            }
            onRenameFolder={(folderId) =>
              router.push({ pathname: "/folder-form", params: { mode: "rename", folderId } })
            }
            onDeleteFolder={openDeleteDialog}
            onOpenCredential={(credentialId) => openCredentialForm({ credentialId })}
            onCopyCredential={copyCredentialPassword}
          />
        </>
      )}

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

      {selectedIds !== null && (
        <View style={[styles.bottomBar, { bottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={openDeleteSelected}
            style={[styles.barButton, styles.deleteButton]}
            accessibilityRole="button"
          >
            <Text style={styles.deleteText}>{t.merge.deleteCount(selectedIds.size)}</Text>
          </Pressable>
          <Pressable
            onPress={openMerge}
            disabled={selectedIds.size < 2}
            style={[
              styles.barButton,
              styles.mainBarButton,
              selectedIds.size < 2 && styles.barButtonDisabled,
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.mainBarText, selectedIds.size < 2 && styles.disabledText]}>
              {t.merge.mergeCount(selectedIds.size)}
            </Text>
          </Pressable>
        </View>
      )}

      {reorder !== null && (
        <View style={[styles.bottomBar, { bottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={() => setReorder(null)}
            style={[styles.barButton, styles.mainBarButton]}
            accessibilityRole="button"
          >
            <Text style={styles.mainBarText}>{t.tree.reorderDone}</Text>
          </Pressable>
        </View>
      )}

      {/* The small search button above "+". Hidden while the "+" menu uses that space. */}
      {!isAddMenuOpen && !isInMode && (
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

      {!isInMode && (
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
      )}

      <DeleteFolderDialog
        visible={isDeleteDialogOpen}
        rows={deleteTarget?.rows ?? []}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        visible={isDeleteSelectedOpen}
        title={t.merge.deleteTitle}
        message={t.merge.deleteMessage(deleteCount)}
        cancelLabel={t.deleteCredential.cancel}
        confirmLabel={t.deleteCredential.confirm}
        onCancel={() => setIsDeleteSelectedOpen(false)}
        onConfirm={confirmDeleteSelected}
      />
    </Pressable>
  );
}

// The time is read here, not while drawing, so the screen shows the same thing until it is checked again.
function readReminder() {
  return { state: readReminderState(), checkedAt: Date.now() };
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
    hidden: {
      display: "none",
    },
    reminder: {
      gap: 8,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.secondaryContainer,
    },
    reminderText: {
      fontSize: 15,
      color: colors.onSecondaryContainer,
    },
    reminderButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
    reminderButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
    },
    listActions: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    reorderHint: {
      color: colors.onSurfaceVariant,
    },
    bottomBar: {
      position: "absolute",
      left: 16,
      right: 16,
      flexDirection: "row",
      gap: 12,
    },
    barButton: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 14,
      borderRadius: 28,
      elevation: 3, // Android shadow
    },
    mainBarButton: {
      backgroundColor: colors.primary,
    },
    barButtonDisabled: {
      backgroundColor: colors.disabledContainer,
    },
    mainBarText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
    deleteButton: {
      backgroundColor: colors.error,
    },
    deleteText: {
      fontSize: 16,
      color: colors.onError,
    },
    collapseButton: {
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
