import { useState } from "react";
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
  onToggleCategory: (categoryId: string) => void;
  onAddSubcategory: (parentId: string) => void;
  onRenameCategory: (categoryId: string) => void;
};

// Shows the whole vault as an expandable tree. Tapping a category expands or collapses it;
// its "⋮" button opens a small list of actions under the row.
// This component does not own the expanded state; the screen passes it in.
export function CategoryTreeList({
  expandedIds,
  onToggleCategory,
  onAddSubcategory,
  onRenameCategory,
}: CategoryTreeListProps) {
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);
  const { categories, credentials } = useVault();
  const rows = getVisibleRows(categories, credentials, expandedIds);
  // The category whose "⋮" actions are open. Only one at a time.
  const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null);

  function toggleMenu(categoryId: string) {
    setMenuCategoryId((current) => (current === categoryId ? null : categoryId));
  }

  return (
    <FlatList
      data={rows}
      // FlatList only redraws rows when `data` changes. The open menu is not part of `data`,
      // so `extraData` tells FlatList to redraw when it changes too.
      extraData={menuCategoryId}
      keyExtractor={getRowKey}
      contentContainerStyle={{ paddingBottom: BOTTOM_SPACE_FOR_BUTTON }}
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
                onPress={() => onToggleCategory(categoryId)}
                onPressMenu={() => toggleMenu(categoryId)}
                onAddSubcategory={() => {
                  setMenuCategoryId(null);
                  onAddSubcategory(categoryId);
                }}
                onRename={() => {
                  setMenuCategoryId(null);
                  onRenameCategory(categoryId);
                }}
              />
            );
          }
          case "credential":
            return <CredentialRow credential={item.credential} depth={item.depth} />;
          case "empty":
            return (
              <Text style={[styles.emptyText, { paddingLeft: item.depth * INDENT_PER_LEVEL }]}>
                {t.tree.empty}
              </Text>
            );
        }
      }}
      ListEmptyComponent={<Text style={styles.emptyText}>{t.tree.noCategories}</Text>}
    />
  );
}

function getRowKey(row: TreeRow): string {
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
          <Icon
            name={isExpanded ? "expandMore" : "chevronRight"}
            color={colors.onSurfaceVariant}
            size={20}
          />
          <Icon name={isExpanded ? "folderOpen" : "folder"} color={colors.primary} />
          <Text style={styles.rowTitle}>{category.name}</Text>
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
        </View>
      )}
    </View>
  );
}

type MenuActionProps = { icon: IconName; label: string; onPress: () => void };

function MenuAction({ icon, label, onPress }: MenuActionProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable onPress={onPress} style={styles.menuAction} accessibilityRole="button">
      <Icon name={icon} color={colors.primary} size={20} />
      <Text style={styles.menuActionText}>{label}</Text>
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
