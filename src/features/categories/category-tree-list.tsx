import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { useVault } from "@/data/vault-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";
import type { Category, Credential } from "@/types/vault";

import { getVisibleRows, type TreeRow } from "./category-tree";

const INDENT_PER_LEVEL = 20;
// Space below the last row, so the round "+" button does not cover it.
const BOTTOM_SPACE_FOR_BUTTON = 88;

type CategoryTreeListProps = {
  expandedIds: ReadonlySet<string>;
  // The category whose "⋮" actions are open (only one at a time), or null.
  menuCategoryId: string | null;
  onToggleCategory: (categoryId: string) => void;
  onToggleMenu: (categoryId: string) => void;
  onCloseMenu: () => void;
  onAddSubcategory: (parentId: string) => void;
  onRenameCategory: (categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
};

// Shows the whole vault as an expandable tree. Tapping a category expands or collapses it;
// its "⋮" button opens a small list of actions under the row.
// This component does not own the expanded or open-menu state; the screen passes them in.
export function CategoryTreeList({
  expandedIds,
  menuCategoryId,
  onToggleCategory,
  onToggleMenu,
  onCloseMenu,
  onAddSubcategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoryTreeListProps) {
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);
  const { categories, credentials } = useVault();
  const rows = getVisibleRows(categories, credentials, expandedIds);

  return (
    <FlatList
      data={rows}
      // FlatList only redraws rows when `data` changes. The open menu is not part of `data`,
      // so `extraData` tells FlatList to redraw when it changes too.
      extraData={menuCategoryId}
      keyExtractor={getRowKey}
      contentContainerStyle={{ paddingBottom: BOTTOM_SPACE_FOR_BUTTON }}
      // Scrolling counts as "doing something else", so it closes an open menu.
      onScrollBeginDrag={onCloseMenu}
      renderItem={({ item }) => {
        switch (item.kind) {
          case "category": {
            const categoryId = item.category.id;
            return (
              <CategoryRow
                category={item.category}
                depth={item.depth}
                isExpanded={item.isExpanded}
                isMenuOpen={menuCategoryId === categoryId}
                onPress={() => {
                  onCloseMenu();
                  onToggleCategory(categoryId);
                }}
                onPressMenu={() => onToggleMenu(categoryId)}
                onAddSubcategory={() => {
                  onCloseMenu();
                  onAddSubcategory(categoryId);
                }}
                onRename={() => {
                  onCloseMenu();
                  onRenameCategory(categoryId);
                }}
                onDelete={() => {
                  onCloseMenu();
                  onDeleteCategory(categoryId);
                }}
              />
            );
          }
          case "credential":
          case "empty":
            // These rows cannot be tapped anyway.
            return <ReadOnlyTreeRow row={item} />;
        }
      }}
      ListEmptyComponent={<Text style={styles.emptyText}>{t.tree.noCategories}</Text>}
    />
  );
}

export function getRowKey(row: TreeRow): string {
  switch (row.kind) {
    case "category":
      return `category-${row.category.id}`;
    case "credential":
      return `credential-${row.credential.id}`;
    case "empty":
      return `empty-${row.parentId}`;
  }
}

type CategoryRowProps = {
  category: Category;
  depth: number;
  isExpanded: boolean;
  isMenuOpen: boolean;
  onPress: () => void;
  onPressMenu: () => void;
  onAddSubcategory: () => void;
  onRename: () => void;
  onDelete: () => void;
};

function CategoryRow({
  category,
  depth,
  isExpanded,
  isMenuOpen,
  onPress,
  onPressMenu,
  onAddSubcategory,
  onRename,
  onDelete,
}: CategoryRowProps) {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const indent = { paddingLeft: depth * INDENT_PER_LEVEL };

  return (
    <View style={styles.row}>
      <View style={styles.categoryLine}>
        <Pressable
          onPress={onPress}
          style={[styles.categoryName, indent]}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
        >
          <CategoryLabel category={category} isExpanded={isExpanded} />
        </Pressable>
        <Pressable
          onPress={onPressMenu}
          hitSlop={8}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel={t.tree.actionsFor(category.name)}
          accessibilityState={{ expanded: isMenuOpen }}
        >
          <Icon name="moreActions" color={colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {isMenuOpen && (
        <View style={[styles.menu, indent]}>
          <MenuAction icon="newFolder" label={t.tree.addSubcategory} onPress={onAddSubcategory} />
          <MenuAction icon="edit" label={t.tree.rename} onPress={onRename} />
          <MenuAction icon="delete" label={t.tree.delete} onPress={onDelete} isDestructive />
        </View>
      )}
    </View>
  );
}

// The arrow, folder icon and name of a category row.
// Shared by the tappable tree and the read-only preview, so both look the same.
function CategoryLabel({ category, isExpanded }: { category: Category; isExpanded: boolean }) {
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
      <Text style={styles.rowTitle}>{category.name}</Text>
    </>
  );
}

// One tree row that cannot be tapped. Used to preview a part of the tree (e.g. before a delete).
export function ReadOnlyTreeRow({ row }: { row: TreeRow }) {
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);
  const indent = { paddingLeft: row.depth * INDENT_PER_LEVEL };

  switch (row.kind) {
    case "category":
      return (
        <View style={[styles.row, styles.categoryName, indent]}>
          <CategoryLabel category={row.category} isExpanded={row.isExpanded} />
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

// Shows title and username only. The password is never rendered in the tree.
function CredentialRow({ credential, depth }: { credential: Credential; depth: number }) {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.row, styles.credentialRow, { paddingLeft: depth * INDENT_PER_LEVEL }]}>
      <Icon name="key" color={colors.onSurfaceVariant} size={20} />
      <View style={styles.credentialText}>
        <Text style={styles.rowTitle}>{credential.title}</Text>
        <Text style={styles.rowSubtitle}>{credential.username ?? t.tree.noUsername}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.outlineVariant,
    },
    categoryLine: {
      flexDirection: "row",
      alignItems: "center",
    },
    categoryName: {
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
