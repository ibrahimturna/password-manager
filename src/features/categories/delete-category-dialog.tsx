import { FlatList, StyleSheet } from "react-native";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import type { TreeRow } from "./category-tree";
import { getRowKey, ReadOnlyTreeRow } from "./category-tree-list";

type DeleteCategoryDialogProps = {
  visible: boolean;
  // Everything that will be deleted, as read-only tree rows.
  rows: TreeRow[];
  onCancel: () => void;
  onConfirm: () => void;
};

// Asks before deleting a category, and shows everything that will be deleted with it.
// A dialog (not a screen), because it is a quick yes/no decision.
export function DeleteCategoryDialog({ visible, rows, onCancel, onConfirm }: DeleteCategoryDialogProps) {
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);

  return (
    <ConfirmDialog
      visible={visible}
      title={t.deleteCategory.title}
      message={t.deleteCategory.willDelete}
      cancelLabel={t.deleteCategory.cancel}
      confirmLabel={t.deleteCategory.confirm}
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
