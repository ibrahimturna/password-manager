import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useVault } from "@/data/vault-context";
import type { Category, Credential } from "@/types/vault";

import { getVisibleRows, type TreeRow } from "./category-tree";

const INDENT_PER_LEVEL = 20;

type CategoryTreeListProps = {
  expandedIds: ReadonlySet<string>;
  onToggleCategory: (categoryId: string) => void;
};

// Shows the whole vault as an expandable tree. Tapping a category expands or collapses it.
// This component does not own the expanded state; the screen passes it in.
export function CategoryTreeList({ expandedIds, onToggleCategory }: CategoryTreeListProps) {
  const { categories, credentials } = useVault();
  const rows = getVisibleRows(categories, credentials, expandedIds);

  return (
    <FlatList
      data={rows}
      keyExtractor={getRowKey}
      renderItem={({ item }) => {
        switch (item.kind) {
          case "category":
            return (
              <CategoryRow
                category={item.category}
                depth={item.depth}
                isExpanded={item.isExpanded}
                onPress={() => onToggleCategory(item.category.id)}
              />
            );
          case "credential":
            return <CredentialRow credential={item.credential} depth={item.depth} />;
          case "empty":
            return (
              <Text style={[styles.emptyText, { paddingLeft: item.depth * INDENT_PER_LEVEL }]}>
                Empty
              </Text>
            );
        }
      }}
      ListEmptyComponent={<Text style={styles.emptyText}>No categories yet.</Text>}
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
  onPress: () => void;
};

function CategoryRow({ category, depth, isExpanded, onPress }: CategoryRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { paddingLeft: depth * INDENT_PER_LEVEL }]}
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
    >
      <Text style={styles.rowTitle}>
        {isExpanded ? "▾" : "▸"} 📁 {category.name}
      </Text>
    </Pressable>
  );
}

// Shows title and username only. The password is never rendered in the tree.
function CredentialRow({ credential, depth }: { credential: Credential; depth: number }) {
  return (
    <View style={[styles.row, { paddingLeft: depth * INDENT_PER_LEVEL }]}>
      <Text style={styles.rowTitle}>🔑 {credential.title}</Text>
      <Text style={styles.rowSubtitle}>{credential.username ?? "No username"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
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
