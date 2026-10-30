import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { useVault } from "@/data/vault-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";
import type { Credential, Folder } from "@/types/vault";

import { getVisibleRows, type TreeRow } from "./folder-tree";

const INDENT_PER_LEVEL = 20;
// Space below the last row, so the round "+" button does not cover it.
const BOTTOM_SPACE_FOR_BUTTON = 88;

type FolderTreeListProps = {
  expandedIds: ReadonlySet<string>;
  // The folder whose "⋮" actions are open (only one at a time), or null.
  menuFolderId: string | null;
  // The credential whose password was just copied (its copy icon shows a check), or null.
  copiedCredentialId: string | null;
  onToggleFolder: (folderId: string) => void;
  onToggleMenu: (folderId: string) => void;
  onCloseMenu: () => void;
  onAddPassword: (folderId: string) => void;
  onAddSubfolder: (parentId: string) => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onOpenCredential: (credentialId: string) => void;
  onCopyCredential: (credentialId: string) => void;
};

// Shows the whole vault as an expandable tree. Tapping a folder expands or collapses it;
// its "⋮" button opens a small list of actions under the row. Tapping a credential opens it;
// long-pressing it, or its copy button, copies its password.
// This component does not own any state; the screen passes it in.
export function FolderTreeList({
  expandedIds,
  menuFolderId,
  copiedCredentialId,
  onToggleFolder,
  onToggleMenu,
  onCloseMenu,
  onAddPassword,
  onAddSubfolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenCredential,
  onCopyCredential,
}: FolderTreeListProps) {
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);
  const { folders, credentials } = useVault();
  const rows = getVisibleRows(folders, credentials, expandedIds);

  return (
    <FlatList
      data={rows}
      // FlatList only redraws rows when `data` changes. The open menu and the copied check mark
      // are not part of `data`, so `extraData` tells FlatList to redraw when they change too.
      extraData={[menuFolderId, copiedCredentialId]}
      keyExtractor={getRowKey}
      contentContainerStyle={{ paddingBottom: BOTTOM_SPACE_FOR_BUTTON }}
      // Scrolling counts as "doing something else", so it closes an open menu.
      onScrollBeginDrag={onCloseMenu}
      renderItem={({ item }) => {
        switch (item.kind) {
          case "folder": {
            const folderId = item.folder.id;
            return (
              <FolderRow
                folder={item.folder}
                depth={item.depth}
                isExpanded={item.isExpanded}
                isMenuOpen={menuFolderId === folderId}
                onPress={() => {
                  onCloseMenu();
                  onToggleFolder(folderId);
                }}
                onPressMenu={() => onToggleMenu(folderId)}
                onAddPassword={() => {
                  onCloseMenu();
                  onAddPassword(folderId);
                }}
                onAddSubfolder={() => {
                  onCloseMenu();
                  onAddSubfolder(folderId);
                }}
                onRename={() => {
                  onCloseMenu();
                  onRenameFolder(folderId);
                }}
                onDelete={() => {
                  onCloseMenu();
                  onDeleteFolder(folderId);
                }}
              />
            );
          }
          case "credential": {
            const credentialId = item.credential.id;
            return (
              <CredentialRow
                credential={item.credential}
                depth={item.depth}
                actions={{
                  isCopied: copiedCredentialId === credentialId,
                  onPress: () => {
                    onCloseMenu();
                    onOpenCredential(credentialId);
                  },
                  onCopy: () => {
                    onCloseMenu();
                    onCopyCredential(credentialId);
                  },
                }}
              />
            );
          }
          case "empty":
            // This row cannot be tapped.
            return <ReadOnlyTreeRow row={item} />;
        }
      }}
      ListEmptyComponent={<Text style={styles.emptyText}>{t.tree.noFolders}</Text>}
    />
  );
}

export function getRowKey(row: TreeRow): string {
  switch (row.kind) {
    case "folder":
      return `folder-${row.folder.id}`;
    case "credential":
      return `credential-${row.credential.id}`;
    case "empty":
      return `empty-${row.parentId}`;
  }
}

type FolderRowProps = {
  folder: Folder;
  depth: number;
  isExpanded: boolean;
  isMenuOpen: boolean;
  onPress: () => void;
  onPressMenu: () => void;
  onAddPassword: () => void;
  onAddSubfolder: () => void;
  onRename: () => void;
  onDelete: () => void;
};

function FolderRow({
  folder,
  depth,
  isExpanded,
  isMenuOpen,
  onPress,
  onPressMenu,
  onAddPassword,
  onAddSubfolder,
  onRename,
  onDelete,
}: FolderRowProps) {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const indent = { paddingLeft: depth * INDENT_PER_LEVEL };

  return (
    <View style={styles.row}>
      <View style={styles.folderLine}>
        <Pressable
          onPress={onPress}
          style={[styles.folderName, indent]}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
        >
          <FolderLabel folder={folder} isExpanded={isExpanded} />
        </Pressable>
        <Pressable
          onPress={onPressMenu}
          hitSlop={8}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel={t.tree.actionsFor(folder.name)}
          accessibilityState={{ expanded: isMenuOpen }}
        >
          <Icon name="moreActions" color={colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {isMenuOpen && (
        <View style={[styles.menu, indent]}>
          <MenuAction icon="newPassword" label={t.tree.addPassword} onPress={onAddPassword} />
          <MenuAction icon="newFolder" label={t.tree.addSubfolder} onPress={onAddSubfolder} />
          <MenuAction icon="edit" label={t.tree.rename} onPress={onRename} />
          <MenuAction icon="delete" label={t.tree.delete} onPress={onDelete} isDestructive />
        </View>
      )}
    </View>
  );
}

// The arrow, folder icon and name of a folder row.
// Shared by the tappable tree and the read-only preview, so both look the same.
function FolderLabel({ folder, isExpanded }: { folder: Folder; isExpanded: boolean }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <>
      <Icon
        name={isExpanded ? "expandMore" : "chevronRight"}
        color={colors.onSurfaceVariant}
        size={20}
      />
      <Icon name={isExpanded ? "folderOpen" : "folder"} color={colors.primary} />
      <Text style={styles.rowTitle}>{folder.name}</Text>
    </>
  );
}

// One tree row that cannot be tapped. Used to preview a part of the tree (e.g. before a delete).
export function ReadOnlyTreeRow({ row }: { row: TreeRow }) {
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);
  const indent = { paddingLeft: row.depth * INDENT_PER_LEVEL };

  switch (row.kind) {
    case "folder":
      return (
        <View style={[styles.row, styles.folderName, indent]}>
          <FolderLabel folder={row.folder} isExpanded={row.isExpanded} />
        </View>
      );
    case "credential":
      return <CredentialRow credential={row.credential} depth={row.depth} />;
    case "empty":
      return <Text style={[styles.emptyText, indent]}>{t.tree.empty}</Text>;
  }
}

type MenuActionProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  // Shown in the error colour, so actions that remove data stand out.
  isDestructive?: boolean;
};

function MenuAction({ icon, label, onPress, isDestructive = false }: MenuActionProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const color = isDestructive ? colors.error : colors.primary;

  return (
    <Pressable onPress={onPress} style={styles.menuAction} accessibilityRole="button">
      <Icon name={icon} color={color} size={20} />
      <Text style={[styles.menuActionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

type CredentialRowActions = {
  isCopied: boolean;
  onPress: () => void;
  onCopy: () => void;
};

// Shows title and username only. The password is never rendered in the tree.
// With `actions` the row can be tapped (open), long-pressed (copy) and has a copy button;
// without them it is read-only (used in previews).
function CredentialRow({
  credential,
  depth,
  actions,
}: {
  credential: Credential;
  depth: number;
  actions?: CredentialRowActions;
}) {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const indent = { paddingLeft: depth * INDENT_PER_LEVEL };

  const content = (
    <>
      <Icon name="key" color={colors.onSurfaceVariant} size={20} />
      <View style={styles.credentialText}>
        <Text style={styles.rowTitle}>{credential.title}</Text>
        <Text style={styles.rowSubtitle}>{credential.username ?? t.tree.noUsername}</Text>
      </View>
    </>
  );

  if (actions === undefined) {
    return <View style={[styles.row, styles.credentialRow, indent]}>{content}</View>;
  }

  return (
    <View style={[styles.row, styles.folderLine]}>
      <Pressable
        onPress={actions.onPress}
        onLongPress={actions.onCopy}
        style={[styles.credentialRow, styles.credentialPressable, indent]}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
      <Pressable
        onPress={actions.onCopy}
        hitSlop={8}
        style={styles.menuButton}
        accessibilityRole="button"
        accessibilityLabel={t.tree.copyPasswordFor(credential.title)}
      >
        <Icon name={actions.isCopied ? "check" : "copy"} color={colors.primary} />
      </Pressable>
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.outlineVariant,
    },
    folderLine: {
      flexDirection: "row",
      alignItems: "center",
    },
    folderName: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
    },
    menuButton: {
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    menu: {
      paddingBottom: 8,
      backgroundColor: colors.surfaceContainer,
    },
    menuAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    menuActionText: {
      fontSize: 16,
      color: colors.primary,
    },
    credentialRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
    },
    credentialPressable: {
      flex: 1, // takes the row's width, leaving room for the copy button
    },
    credentialText: {
      flex: 1,
    },
    rowTitle: {
      flexShrink: 1, // long names wrap instead of pushing the "⋮" button off screen
      fontSize: 18,
      color: colors.onSurface,
    },
    rowSubtitle: {
      marginTop: 2,
      color: colors.onSurfaceVariant,
    },
    emptyText: {
      paddingVertical: 12,
      color: colors.onSurfaceVariant,
      fontStyle: "italic",
    },
  });
}
