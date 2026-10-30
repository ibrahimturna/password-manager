import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useVault } from "@/data/vault-context";
import { useTranslation } from "@/i18n/use-translation";
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
// its "⋯" button opens a small list of actions under the row.
// This component does not own the expanded state; the screen passes it in.
export function CategoryTreeList({
  expandedIds,
  onToggleCategory,
  onAddSubcategory,
  onRenameCategory,
}: CategoryTreeListProps) {
  const t = useTranslation();
  const { categories, credentials } = useVault();
  const rows = getVisibleRows(categories, credentials, expandedIds);
  // The category whose "⋯" actions are open. Only one at a time.
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
          <Text style={styles.rowTitle}>
            {isExpanded ? "▾" : "▸"} 📁 {category.name}
          </Text>
        </Pressable>
        <Pressable
          onPress={onPressMenu}
          hitSlop={8}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel={t.tree.actionsFor(category.name)}
          accessibilityState={{ expanded: isMenuOpen }}
        >
          <Text style={styles.menuButtonText}>⋯</Text>
        </Pressable>
      </View>

      {isMenuOpen && (
        <View style={[styles.menu, indent]}>
          <MenuAction label={`➕ ${t.tree.addSubcategory}`} onPress={onAddSubcategory} />
          <MenuAction label={`✏️ ${t.tree.rename}`} onPress={onRename} />
        </View>
      )}
    </View>
  );
}

function MenuAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.menuAction} accessibilityRole="button">
      <Text style={styles.menuActionText}>{label}</Text>
    </Pressable>
  );
}

// Shows title and username only. The password is never rendered in the tree.
function CredentialRow({ credential, depth }: { credential: Credential; depth: number }) {
  const t = useTranslation();

  return (
    <View style={[styles.row, styles.credentialRow, { paddingLeft: depth * INDENT_PER_LEVEL }]}>
      <Text style={styles.rowTitle}>🔑 {credential.title}</Text>
      <Text style={styles.rowSubtitle}>{credential.username ?? t.tree.noUsername}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  categoryLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryName: {
    flex: 1,
    paddingVertical: 12,
  },
  menuButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuButtonText: {
    fontSize: 22,
    color: "#666",
  },
  menu: {
    paddingBottom: 8,
  },
  menuAction: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  menuActionText: {
    fontSize: 16,
    color: "#208AEF",
  },
  credentialRow: {
    paddingVertical: 12,
  },
  rowTitle: {
    fontSize: 18,
  },
  rowSubtitle: {
    marginTop: 2,
    color: "#666",
  },
  emptyText: {
    paddingVertical: 12,
    color: "#666",
    fontStyle: "italic",
  },
});
