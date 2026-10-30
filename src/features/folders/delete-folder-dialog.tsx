import { FlatList, StyleSheet } from "react-native";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import type { TreeRow } from "./folder-tree";
import { getRowKey, ReadOnlyTreeRow } from "./folder-tree-list";

type DeleteFolderDialogProps = {
  visible: boolean;
  // Everything that will be deleted, as read-only tree rows.
  rows: TreeRow[];
  onCancel: () => void;
  onConfirm: () => void;
};

// Asks before deleting a folder, and shows everything that will be deleted with it.
// A dialog (not a screen), because it is a quick yes/no decision.
export function DeleteFolderDialog({ visible, rows, onCancel, onConfirm }: DeleteFolderDialogProps) {
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);

  return (
    <ConfirmDialog
      visible={visible}
      title={t.deleteFolder.title}
      message={t.deleteFolder.willDelete}
      cancelLabel={t.deleteFolder.cancel}
      confirmLabel={t.deleteFolder.confirm}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <FlatList
        data={rows}
        keyExtractor={getRowKey}
        renderItem={({ item }) => <ReadOnlyTreeRow row={item} />}
        style={styles.preview}
        contentContainerStyle={styles.previewContent}
      />
    </ConfirmDialog>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    preview: {
      flexGrow: 0, // only as tall as its content; scrolls inside the dialog when long
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: 12,
      // Same colour as the dialog; the border alone marks the preview area.
      backgroundColor: colors.surfaceContainerHigh,
    },
    previewContent: {
      paddingHorizontal: 12,
    },
  });
}
