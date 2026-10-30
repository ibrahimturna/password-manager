import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SegmentedControl } from "@/components/segmented-control";
import { useVault } from "@/data/vault-context";
import {
  type FolderNameError,
  MAX_FOLDER_NAME_LENGTH,
} from "@/features/folders/folder-name";
import { FolderPickerRow, getFolderPickerRows } from "@/features/folders/folder-picker";
import { getFolderById, getFolderPath } from "@/features/folders/folder-tree";
import { useExpandedFolders } from "@/features/folders/expanded-folders-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Translations } from "@/i18n/en";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";
import type { Folder } from "@/types/vault";

type Mode = "create" | "rename";

// Creates a folder or renames one.
// Opened with no params from the round "+" button (new top-level folder),
// or from a row's "⋮" actions with `mode` and `folderId` filled in.
export default function FolderFormScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ mode?: string; folderId?: string }>();
  const { folders, createFolder, renameFolder } = useVault();
  const { expandWithParents } = useExpandedFolders();
  const insets = useSafeAreaInsets();

  // The params only set the starting values. Unknown values fall back to "new top-level folder".
  const initialFolder =
    params.folderId === undefined ? undefined : getFolderById(folders, params.folderId);
  const initialMode: Mode =
    params.mode === "rename" && initialFolder !== undefined ? "rename" : "create";

  const [mode, setMode] = useState<Mode>(initialMode);
  // create: the parent (null = top level). rename: the folder to rename (null = none chosen yet).
  const [selectedId, setSelectedId] = useState<string | null>(initialFolder?.id ?? null);
  const [name, setName] = useState(initialMode === "rename" ? (initialFolder?.name ?? "") : "");
  const [error, setError] = useState<FolderNameError | null>(null);

  const pickerRows = getFolderPickerRows(folders);

  const selectedPath =
    selectedId === null
      ? null
      : getFolderPath(folders, selectedId)
          .map((folder) => folder.name)
          .join(" › ");
  const canSave = mode === "create" || selectedId !== null;

  function changeMode(nextMode: Mode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setSelectedId(null);
    setName("");
    setError(null);
  }

  function selectFolder(folder: Folder | null) {
    setSelectedId(folder?.id ?? null);
    setError(null);
    if (mode === "rename" && folder !== null) {
      setName(folder.name);
    }
  }

  function save() {
    if (mode === "create") {
      const result = createFolder(name, selectedId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Open the parent (and the folders above it) so the new folder is visible.
      // We open the parent, not the new folder: `folders` in this render does not
      // contain the new folder yet, but it does contain the parent.
      expandWithParents(selectedId);
    } else {
      if (selectedId === null) return;
      const result = renameFolder(selectedId, name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      expandWithParents(getFolderById(folders, selectedId)?.parentId ?? null);
    }
    router.back();
  }

  const header = (
    <View style={styles.form}>
      <SegmentedControl
        options={[
          { value: "create", label: t.folderForm.newFolder },
          { value: "rename", label: t.folderForm.rename },
        ]}
        value={mode}
        onChange={changeMode}
      />

      <Text style={styles.label}>{mode === "create" ? t.folderForm.createInside : t.folderForm.folderToRename}</Text>
      <Text style={styles.selection}>
        {mode === "create"
          ? (selectedPath ?? t.folderForm.topLevel)
          : (selectedPath ?? t.folderForm.chooseFolderBelow)}
      </Text>

      <Text style={styles.label}>{mode === "create" ? t.folderForm.name : t.folderForm.newName}</Text>
      <TextInput
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        onSubmitEditing={save}
        editable={canSave}
        // The phone refuses extra characters itself (no flicker). It counts like `.length`,
        // so an emoji uses 2 places; validateFolderName still checks every name on save.
        maxLength={MAX_FOLDER_NAME_LENGTH}
        // Open the keyboard straight away only when a row's "⋮" action chose the folder.
        autoFocus={initialFolder !== undefined}
        returnKeyType="done"
        placeholder={canSave ? t.folderForm.namePlaceholder : t.folderForm.chooseFolderFirst}
        placeholderTextColor={colors.onSurfaceVariant}
        selectionColor={colors.primary}
        // The style never changes after the input appears: on Android, changing the input's
        // background later reset its padding to zero.
        style={styles.input}
        accessibilityLabel={mode === "create" ? t.folderForm.name : t.folderForm.newName}
      />
      {error !== null && <Text style={styles.error}>{getErrorMessage(error, t)}</Text>}

      <View style={styles.buttons}>
        <Pressable onPress={() => router.back()} style={styles.button} accessibilityRole="button">
          <Text style={styles.cancelText}>{t.folderForm.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.button, styles.saveButton, !canSave && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
        >
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            {t.folderForm.save}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.label}>
        {mode === "create" ? t.folderForm.chooseWhereToCreate : t.folderForm.chooseFolder}
      </Text>
      {mode === "create" && (
        <FolderPickerRow
          icon="home"
          label={t.folderForm.topLevel}
          depth={0}
          isSelected={selectedId === null}
          onPress={() => selectFolder(null)}
        />
      )}
    </View>
  );

  return (
    <FlatList
      data={pickerRows}
      keyExtractor={(row) => row.folder.id}
      ListHeaderComponent={header}
      // Lets a tap on a list row work while the keyboard is open.
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      renderItem={({ item }) => (
        <FolderPickerRow
          icon="folder"
          label={item.folder.name}
          depth={item.depth}
          isSelected={selectedId === item.folder.id}
          onPress={() => selectFolder(item.folder)}
        />
      )}
    />
  );
}

// Turns an error code into text for the user, in the current language.
function getErrorMessage(error: FolderNameError, t: Translations): string {
  switch (error) {
    case "empty":
      return t.folderForm.errors.empty;
    case "too-long":
      return t.folderForm.errors.tooLong(MAX_FOLDER_NAME_LENGTH);
    case "duplicate":
      return t.folderForm.errors.duplicate;
  }
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
  });
}
