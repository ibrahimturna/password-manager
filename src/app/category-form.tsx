import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import type { Category } from "@/types/vault";

type Mode = "create" | "rename";

const INDENT_PER_LEVEL = 20;

// Creates a category or renames one.
// Opened with no params from the round "+" button (new top-level category),
// or from a row's "⋯" actions with `mode` and `categoryId` filled in.
export default function CategoryFormScreen() {
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
      <View style={styles.modeSwitch}>
        <ModeButton label="New category" isSelected={mode === "create"} onPress={() => changeMode("create")} />
        <ModeButton label="Rename" isSelected={mode === "rename"} onPress={() => changeMode("rename")} />
      </View>

      <Text style={styles.label}>{mode === "create" ? "Create inside" : "Category to rename"}</Text>
      <Text style={styles.selection}>
        {mode === "create"
          ? (selectedPath ?? "Top level")
          : (selectedPath ?? "Choose a category from the list below")}
      </Text>

      <Text style={styles.label}>{mode === "create" ? "Name" : "New name"}</Text>
      <TextInput
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        onSubmitEditing={save}
        editable={canSave}
        // Open the keyboard straight away only when a row's "⋯" action chose the category.
        autoFocus={initialCategory !== undefined}
        returnKeyType="done"
        placeholder="e.g. Kredi Kartları"
        style={[styles.input, !canSave && styles.inputDisabled]}
        accessibilityLabel={mode === "create" ? "Name" : "New name"}
      />
      {error !== null && <Text style={styles.error}>{getErrorMessage(error)}</Text>}

      <View style={styles.buttons}>
        <Pressable onPress={() => router.back()} style={styles.button} accessibilityRole="button">
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.button, styles.saveButton, !canSave && styles.saveButtonDisabled]}
          accessibilityRole="button"
        >
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>
        {mode === "create" ? "Choose where to create it" : "Choose a category"}
      </Text>
      {mode === "create" && (
        <PickerRow
          label="🏠 Top level"
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
          label={`📁 ${item.category.name}`}
          depth={item.depth}
          isSelected={selectedId === item.category.id}
          onPress={() => selectCategory(item.category)}
        />
      )}
    />
  );
}

// Turns an error code into text for the user. Translations come in the languages milestone.
function getErrorMessage(error: CategoryNameError): string {
  switch (error) {
    case "empty":
      return "Name is required.";
    case "too-long":
      return `Name can be at most ${MAX_CATEGORY_NAME_LENGTH} characters.`;
    case "duplicate":
      return "A category with this name already exists here.";
  }
}

type ModeButtonProps = { label: string; isSelected: boolean; onPress: () => void };

function ModeButton({ label, isSelected, onPress }: ModeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeButton, isSelected && styles.modeButtonSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={[styles.modeText, isSelected && styles.modeTextSelected]}>{label}</Text>
    </Pressable>
  );
}

type PickerRowProps = { label: string; depth: number; isSelected: boolean; onPress: () => void };

function PickerRow({ label, depth, isSelected, onPress }: PickerRowProps) {
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
      <Text style={styles.pickerText}>{label}</Text>
      {isSelected && <Text style={styles.pickerCheck}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  form: {
    gap: 8,
  },
  modeSwitch: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#208AEF",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  modeButtonSelected: {
    backgroundColor: "#208AEF",
  },
  modeText: {
    fontSize: 16,
    color: "#208AEF",
  },
  modeTextSelected: {
    color: "#fff",
  },
  label: {
    marginTop: 8,
    color: "#666",
  },
  selection: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    // Always set a background colour. On Android, adding one later (when the input becomes
    // disabled) replaces the input's background and resets its padding to zero.
    backgroundColor: "#fff",
  },
  inputDisabled: {
    backgroundColor: "#f2f2f2",
  },
  error: {
    color: "#D93025",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 4,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 16,
    color: "#208AEF",
  },
  saveButton: {
    backgroundColor: "#208AEF",
  },
  saveButtonDisabled: {
    backgroundColor: "#aaa",
  },
  saveText: {
    fontSize: 16,
    color: "#fff",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingRight: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  pickerRowSelected: {
    backgroundColor: "#E6F4FE",
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
  },
  pickerCheck: {
    fontSize: 16,
    color: "#208AEF",
  },
});
