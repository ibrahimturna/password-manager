import { Pressable, StyleSheet, Text, View } from "react-native";
import ReorderableList, { useReorderableDrag } from "react-native-reorderable-list";

import { Icon } from "@/components/icon";
import { useVault } from "@/data/vault-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";
import type { Folder } from "@/types/vault";

import { getChildFolders } from "./folder-tree";

// Space below the last row, so the Done button does not cover it.
const BOTTOM_SPACE_FOR_BUTTON = 90;

// The folders of one level, all closed. Dragging a handle changes their order, which is saved
// straight away. The list scrolls by itself near its top and bottom edges.
export function FolderReorderList({ parentId }: { parentId: string | null }) {
  const { folders, moveFolder } = useVault();

  return (
    <ReorderableList
      data={getChildFolders(folders, parentId)}
      keyExtractor={(folder) => folder.id}
      renderItem={({ item }) => <ReorderRow folder={item} />}
      onReorder={({ from, to }) => moveFolder(parentId, from, to)}
      contentContainerStyle={{ paddingBottom: BOTTOM_SPACE_FOR_BUTTON }}
    />
  );
}

function ReorderRow({ folder }: { folder: Folder }) {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const drag = useReorderableDrag();

  return (
    <View style={styles.row}>
      <Icon name="folder" color={colors.primary} />
      <Text style={styles.name}>{folder.name}</Text>
      {/* The rest of the row scrolls the list, so only the handle starts a drag. */}
      <Pressable
        onPressIn={drag}
        hitSlop={8}
        style={styles.handle}
        accessibilityLabel={t.tree.moveFolder(folder.name)}
      >
        <Icon name="drag" color={colors.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.outlineVariant,
      backgroundColor: colors.surface, // the dragged row covers the rows it passes
    },
    name: {
      flex: 1,
      fontSize: 18,
      color: colors.onSurface,
    },
    handle: {
      padding: 8,
    },
  });
}
