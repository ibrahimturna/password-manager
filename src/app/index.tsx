import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryTreeList } from "@/features/categories/category-tree-list";
import { useExpandedCategories } from "@/features/categories/expanded-categories-context";
import { useTranslation } from "@/i18n/use-translation";

export default function HomeScreen() {
  const t = useTranslation();
  const { expandedIds, toggleCategory, collapseAll } = useExpandedCategories();
  // Keeps the round button above Android's navigation bar.
  const insets = useSafeAreaInsets();

  const hasExpanded = expandedIds.size > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.notice}>{t.home.mockNotice}</Text>

      <Pressable
        onPress={collapseAll}
        disabled={!hasExpanded}
        style={styles.collapseButton}
        accessibilityRole="button"
      >
        <Text style={[styles.collapseText, !hasExpanded && styles.disabledText]}>
          {t.home.collapseAll}
        </Text>
      </Pressable>

      <CategoryTreeList
        expandedIds={expandedIds}
        onToggleCategory={toggleCategory}
        onAddSubcategory={(parentId) =>
          router.push({ pathname: "/category-form", params: { mode: "create", categoryId: parentId } })
        }
        onRenameCategory={(categoryId) =>
          router.push({ pathname: "/category-form", params: { mode: "rename", categoryId } })
        }
      />

      <Pressable
        onPress={() => router.push("/category-form")}
        style={[styles.floatingButton, { bottom: insets.bottom + 16 }]}
        accessibilityRole="button"
        accessibilityLabel={t.home.newCategoryButton}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </Pressable>
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
  floatingButton: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28, // half the size makes a circle
    backgroundColor: "#208AEF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4, // Android shadow
  },
  floatingButtonText: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 32,
  },
});
