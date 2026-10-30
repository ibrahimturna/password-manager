import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useVault } from "@/data/vault-context";
import { toggleExpanded } from "@/features/categories/category-tree";
import { CategoryTreeList } from "@/features/categories/category-tree-list";

export default function HomeScreen() {
  const { categories } = useVault();

  // Which categories are currently open. A Set makes "is this one open?" a quick lookup.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  function toggleCategory(categoryId: string) {
    // `current` is the latest state; toggleExpanded returns a new Set, so React re-renders.
    setExpandedIds((current) => toggleExpanded(current, categoryId, categories));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  const hasExpanded = expandedIds.size > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.notice}>
        Mock data only — do not enter real passwords.
      </Text>

      <Pressable
        onPress={collapseAll}
        disabled={!hasExpanded}
        style={styles.collapseButton}
        accessibilityRole="button"
      >
        <Text style={[styles.collapseText, !hasExpanded && styles.disabledText]}>
          Collapse all
        </Text>
      </Pressable>

      <CategoryTreeList expandedIds={expandedIds} onToggleCategory={toggleCategory} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  notice: {
    textAlign: "center",
    color: "#666",
  },
  collapseButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  collapseText: {
    color: "#208AEF",
    fontSize: 16,
  },
  disabledText: {
    color: "#aaa",
  },
});
