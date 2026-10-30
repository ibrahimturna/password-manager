import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { SegmentedControl } from "@/components/segmented-control";
import { useVault } from "@/data/vault-context";
import {
  type CategoryNameError,
  MAX_CATEGORY_NAME_LENGTH,
} from "@/features/categories/category-name";
import {
  getCategoryById,
  getCategoryPath,
  getVisibleRows,
} from "@/features/categories/category-tree";
import { useExpandedCategories } from "@/features/categories/expanded-categories-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Translations } from "@/i18n/en";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";
import type { Category } from "@/types/vault";

type Mode = "create" | "rename";

const INDENT_PER_LEVEL = 20;

// Creates a category or renames one.
// Opened with no params from the round "+" button (new top-level category),
// or from a row's "⋮" actions with `mode` and `categoryId` filled in.
export default function CategoryFormScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ mode?: string; categoryId?: string }>();
  const { categories, createCategory, renameCategory } = useVault();
  const { expandWithParents } = useExpandedCategories();
  const insets = useSafeAreaInsets();

  // The params only set the starting values. Unknown values fall back to "new top-level category".
  const initialCategory =
    params.categoryId === undefined ? undefined : getCategoryById(categories, params.categoryId);
  const initialMode: Mode =
    params.mode === "rename" && initialCategory !== undefined ? "rename" : "create";

  const [mode, setMode] = useState<Mode>(initialMode);
  // create: the parent (null = top level). rename: the category to rename (null = none chosen yet).
  const [selectedId, setSelectedId] = useState<string | null>(initialCategory?.id ?? null);
  const [name, setName] = useState(initialMode === "rename" ? (initialCategory?.name ?? "") : "");
  const [error, setError] = useState<CategoryNameError | null>(null);

  // Every category in tree order, with its depth for indentation.
  // Reuses getVisibleRows by treating every category as expanded and passing no credentials.
  const allCategoryIds = new Set(categories.map((category) => category.id));
  const pickerRows = getVisibleRows(categories, [], allCategoryIds).flatMap((row) =>
    row.kind === "category" ? [row] : [],
  );

  const selectedPath =
    selectedId === null
      ? null
      : getCategoryPath(categories, selectedId)
          .map((category) => category.name)
          .join(" › ");
  const canSave = mode === "create" || selectedId !== null;

  function changeMode(nextMode: Mode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setSelectedId(null);
    setName("");
    setError(null);
  }

  function selectCategory(category: Category | null) {
    setSelectedId(category?.id ?? null);
    setError(null);
    if (mode === "rename" && category !== null) {
      setName(category.name);
    }
  }

  function save() {
    if (mode === "create") {
      const result = createCategory(name, selectedId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Open the parent (and the categories above it) so the new category is visible.
      // We open the parent, not the new category: `categories` in this render does not
      // contain the new category yet, but it does contain the parent.
      expandWithParents(selectedId);
    } else {
      if (selectedId === null) return;
      const result = renameCategory(selectedId, name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      expandWithParents(getCategoryById(categories, selectedId)?.parentId ?? null);
    }
    router.back();
  }

  const header = (
    <View style={styles.form}>
      <SegmentedControl
        options={[
          { value: "create", label: t.categoryForm.newCategory },
          { value: "rename", label: t.categoryForm.rename },
        ]}
        value={mode}
        onChange={changeMode}
      />

      <Text style={styles.label}>{mode === "create" ? t.categoryForm.createInside : t.categoryForm.categoryToRename}</Text>
      <Text style={styles.selection}>
        {mode === "create"
          ? (selectedPath ?? t.categoryForm.topLevel)
          : (selectedPath ?? t.categoryForm.chooseCategoryBelow)}
      </Text>

      <Text style={styles.label}>{mode === "create" ? t.categoryForm.name : t.categoryForm.newName}</Text>
      <TextInput
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        onSubmitEditing={save}
        editable={canSave}
        // Open the keyboard straight away only when a row's "⋮" action chose the category.
        autoFocus={initialCategory !== undefined}
        returnKeyType="done"
        placeholder={canSave ? t.categoryForm.namePlaceholder : t.categoryForm.chooseCategoryFirst}
        placeholderTextColor={colors.onSurfaceVariant}
        selectionColor={colors.primary}
        // The style never changes after the input appears: on Android, changing the input's
        // background later reset its padding to zero.
        style={styles.input}
        accessibilityLabel={mode === "create" ? t.categoryForm.name : t.categoryForm.newName}
      />
      {error !== null && <Text style={styles.error}>{getErrorMessage(error, t)}</Text>}

      <View style={styles.buttons}>
        <Pressable onPress={() => router.back()} style={styles.button} accessibilityRole="button">
          <Text style={styles.cancelText}>{t.categoryForm.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.button, styles.saveButton, !canSave && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
        >
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            {t.categoryForm.save}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.label}>
        {mode === "create" ? t.categoryForm.chooseWhereToCreate : t.categoryForm.chooseCategory}
      </Text>
      {mode === "create" && (
        <PickerRow
          icon="home"
          label={t.categoryForm.topLevel}
          depth={0}
          isSelected={selectedId === null}
          onPress={() => selectCategory(null)}
        />
      )}
    </View>
  );

  return (
    <FlatList
      data={pickerRows}
      keyExtractor={(row) => row.category.id}
      ListHeaderComponent={header}
      // Lets a tap on a list row work while the keyboard is open.
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      renderItem={({ item }) => (
        <PickerRow
          icon="folder"
          label={item.category.name}
          depth={item.depth}
          isSelected={selectedId === item.category.id}
          onPress={() => selectCategory(item.category)}
        />
      )}
    />
  );
}

// Turns an error code into text for the user, in the current language.
function getErrorMessage(error: CategoryNameError, t: Translations): string {
  switch (error) {
    case "empty":
      return t.categoryForm.errors.empty;
    case "too-long":
      return t.categoryForm.errors.tooLong(MAX_CATEGORY_NAME_LENGTH);
    case "duplicate":
      return t.categoryForm.errors.duplicate;
  }
}

type PickerRowProps = {
  icon: IconName;
  label: string;
  depth: number;
  isSelected: boolean;
  onPress: () => void;
};

function PickerRow({ icon, label, depth, isSelected, onPress }: PickerRowProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const contentColor = isSelected ? colors.onPrimaryContainer : colors.onSurfaceVariant;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pickerRow,
        { paddingLeft: 12 + depth * INDENT_PER_LEVEL },
        isSelected && styles.pickerRowSelected,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Icon name={icon} color={contentColor} size={20} />
      <Text style={[styles.pickerText, isSelected && styles.pickerTextSelected]}>{label}</Text>
      {isSelected && <Icon name="check" color={contentColor} size={20} />}
    </Pressable>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    content: {
      padding: 16,
    },
    form: {
      gap: 8,
    },
    label: {
      marginTop: 8,
      color: colors.onSurfaceVariant,
    },
    selection: {
      fontSize: 16,
      color: colors.onSurface,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 18,
      color: colors.onSurface,
      // Material 3 "outlined" text field: same background as the screen, only a border.
      backgroundColor: colors.surface,
    },
    error: {
      color: colors.error,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 4,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
    },
    cancelText: {
      fontSize: 16,
      color: colors.primary,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    saveButtonDisabled: {
      backgroundColor: colors.disabledContainer,
    },
    saveText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
    saveTextDisabled: {
      color: colors.disabledContent,
    },
    pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
      paddingRight: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.outlineVariant,
    },
    pickerRowSelected: {
      backgroundColor: colors.primaryContainer,
    },
    pickerText: {
      flex: 1,
      fontSize: 16,
      color: colors.onSurface,
    },
    pickerTextSelected: {
      color: colors.onPrimaryContainer,
      fontWeight: "600",
    },
  });
}
