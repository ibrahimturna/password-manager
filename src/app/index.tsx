import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { CategoryTreeList } from "@/features/categories/category-tree-list";
import { useExpandedCategories } from "@/features/categories/expanded-categories-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

export default function HomeScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { expandedIds, toggleCategory, collapseAll } = useExpandedCategories();
  // Keeps the round button above Android's navigation bar.
  const insets = useSafeAreaInsets();
  // The category whose "⋮" actions are open, or null. Only one at a time.
  const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null);

  const hasExpanded = expandedIds.size > 0;

  function toggleMenu(categoryId: string) {
    setMenuCategoryId((current) => (current === categoryId ? null : categoryId));
  }

  function closeMenu() {
    setMenuCategoryId(null);
  }

  // The returned function runs when this screen loses focus (another screen opens on top),
  // so a menu is never left open behind the form or the settings screen.
  useFocusEffect(
    useCallback(() => {
      return () => setMenuCategoryId(null);
    }, []),
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
        onToggleCategory={toggleCategory}
        onToggleMenu={toggleMenu}
        onCloseMenu={closeMenu}
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
        <Icon name="add" color={colors.onPrimaryContainer} size={28} />
      </Pressable>
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
      width: 56,
      height: 56,
      borderRadius: 28, // half the size makes a circle
      backgroundColor: colors.primaryContainer,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4, // Android shadow
    },
  });
}
