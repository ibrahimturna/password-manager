import { Pressable, StyleSheet, Text } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";
import type { Category } from "@/types/vault";

import { getVisibleRows } from "./category-tree";

const INDENT_PER_LEVEL = 20;

// Every category in tree order, with its depth for indentation, for a list to pick from.
// Reuses getVisibleRows by treating every category as expanded and passing no credentials.
export function getCategoryPickerRows(categories: Category[]) {
  const allCategoryIds = new Set(categories.map((category) => category.id));
  return getVisibleRows(categories, [], allCategoryIds).flatMap((row) =>
    row.kind === "category" ? [row] : [],
  );
}

type CategoryPickerRowProps = {
  icon: IconName;
  label: string;
  depth: number;
  isSelected: boolean;
  onPress: () => void;
};

// One choice in a category list. Used by the category form and the credential form.
export function CategoryPickerRow({ icon, label, depth, isSelected, onPress }: CategoryPickerRowProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const contentColor = isSelected ? colors.onPrimaryContainer : colors.onSurfaceVariant;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { paddingLeft: 12 + depth * INDENT_PER_LEVEL },
        isSelected && styles.rowSelected,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Icon name={icon} color={contentColor} size={20} />
      <Text style={[styles.text, isSelected && styles.textSelected]}>{label}</Text>
      {isSelected && <Icon name="check" color={contentColor} size={20} />}
    </Pressable>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
      paddingRight: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.outlineVariant,
    },
    rowSelected: {
      backgroundColor: colors.primaryContainer,
    },
    text: {
      flex: 1,
      fontSize: 16,
      color: colors.onSurface,
    },
    textSelected: {
      color: colors.onPrimaryContainer,
      fontWeight: "600",
    },
  });
}
