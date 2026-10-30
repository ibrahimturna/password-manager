import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import type { VaultContents } from "@/data/vault-repository";
import { getFolderPath, getVisibleRows, toggleExpanded, type TreeRow } from "@/features/folders/folder-tree";
import { getRowKey, ReadOnlyTreeRow } from "@/features/folders/folder-tree-list";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";
import type { Credential, Folder } from "@/types/vault";

import {
  getRestoreTree,
  type RestoreChoice,
  type RestoreConflict,
  type RestorePlan,
} from "./restore-plan";

type RestoreReviewProps = {
  plan: RestorePlan;
  phoneFolders: Folder[];
  backup: VaultContents;
  onCancel: () => void;
  onRestore: (choices: ReadonlyMap<string, RestoreChoice>) => void;
};

// Shows the backup as a tree, with what restoring would do to each item.
// Every conflict must be answered before restoring, so nothing is decided silently.
export function RestoreReview({
  plan,
  phoneFolders,
  backup,
  onCancel,
  onRestore,
}: RestoreReviewProps) {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [tree] = useState(() => getRestoreTree(plan, backup.folders));
  const [expandedIds, setExpandedIds] = useState(tree.openFolderIds);
  const [choices, setChoices] = useState<ReadonlyMap<string, RestoreChoice>>(new Map());

  const conflicts = new Map(plan.conflicts.map((conflict) => [conflict.backup.id, conflict]));
  const hasChanges =
    plan.newFolders.length > 0 || plan.newCredentials.length > 0 || plan.conflicts.length > 0;
  const unansweredCount = plan.conflicts.filter(({ backup: item }) => !choices.has(item.id)).length;

  function choose(backupId: string, choice: RestoreChoice) {
    setChoices((current) => new Map(current).set(backupId, choice));
  }

  function chooseAll(choice: RestoreChoice) {
    setChoices(new Map(plan.conflicts.map(({ backup: item }) => [item.id, choice])));
  }

  function getBadge(row: TreeRow): string | undefined {
    if (row.kind === "folder") {
      return tree.newFolderIds.has(row.folder.id) ? t.backup.badgeNew : undefined;
    }
    if (row.kind === "empty") return undefined;
    switch (tree.credentialStatuses.get(row.credential.id)) {
      case "new":
        return t.backup.badgeNew;
      case "conflict":
        return t.backup.badgeDifferent;
      default:
        return t.backup.badgeSame;
    }
  }

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>{t.backup.reviewTitle}</Text>
      <Text style={styles.text}>{hasChanges ? t.backup.treeHint : t.backup.nothingToRestore}</Text>

      {plan.conflicts.length > 0 && (
        <>
          <Text style={styles.title}>{t.backup.conflictsTitle(plan.conflicts.length)}</Text>
          <Text style={styles.text}>{t.backup.conflictsHint}</Text>
          <View style={styles.allButtons}>
            <Pressable onPress={() => chooseAll("phone")} accessibilityRole="button">
              <Text style={styles.link}>{t.backup.keepAllPhone}</Text>
            </Pressable>
            <Pressable onPress={() => chooseAll("backup")} accessibilityRole="button">
              <Text style={styles.link}>{t.backup.keepAllBackup}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {unansweredCount > 0 && (
        <Text style={styles.error}>{t.backup.chooseRemaining(unansweredCount)}</Text>
      )}
      <View style={styles.buttons}>
        <Pressable onPress={onCancel} style={styles.button} accessibilityRole="button">
          <Text style={styles.link}>{t.backup.cancel}</Text>
        </Pressable>
        {hasChanges && (
          <Pressable
            onPress={() => onRestore(choices)}
            disabled={unansweredCount > 0}
            style={[
              styles.button,
              styles.restoreButton,
              unansweredCount > 0 && styles.disabledButton,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: unansweredCount > 0 }}
          >
            <Text style={styles.restoreText}>{t.backup.restore}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <FlatList
      data={getVisibleRows(backup.folders, backup.credentials, expandedIds)}
      keyExtractor={getRowKey}
      extraData={choices}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => {
        const conflict = item.kind === "credential" ? conflicts.get(item.credential.id) : undefined;
        return (
          <>
            <ReadOnlyTreeRow
              row={item}
              badge={getBadge(item)}
              onToggleFolder={(folderId) =>
                setExpandedIds((current) => toggleExpanded(current, folderId, backup.folders))
              }
            />
            {conflict !== undefined && (
              <ConflictCard
                conflict={conflict}
                phoneFolders={phoneFolders}
                backupFolders={backup.folders}
                choice={choices.get(conflict.backup.id)}
                onChoose={(choice) => choose(conflict.backup.id, choice)}
              />
            )}
          </>
        );
      }}
    />
  );
}

type ConflictCardProps = {
  conflict: RestoreConflict;
  phoneFolders: Folder[];
  backupFolders: Folder[];
  choice: RestoreChoice | undefined;
  onChoose: (choice: RestoreChoice) => void;
};

function getPathText(folders: Folder[], folderId: string): string {
  return getFolderPath(folders, folderId)
    .map((folder) => folder.name)
    .join(" › ");
}

// The two versions of a password, one above the other. Tapping a version chooses it.
function ConflictCard({
  conflict,
  phoneFolders,
  backupFolders,
  choice,
  onChoose,
}: ConflictCardProps) {
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);
  const [arePasswordsVisible, setArePasswordsVisible] = useState(false);
  const { phone, backup } = conflict;
  const phonePath = getPathText(phoneFolders, phone.folderId);
  const backupPath = getPathText(backupFolders, backup.folderId);

  return (
    <View style={styles.conflict}>
      <Version
        heading={t.backup.currentVersion}
        chosenText={t.backup.willStay}
        credential={phone}
        path={phonePath}
        other={backup}
        otherPath={backupPath}
        isChosen={choice === "phone"}
        isPasswordVisible={arePasswordsVisible}
        onChoose={() => onChoose("phone")}
      />
      <Version
        heading={t.backup.backupVersion}
        chosenText={t.backup.willReplace}
        credential={backup}
        path={backupPath}
        other={phone}
        otherPath={phonePath}
        isChosen={choice === "backup"}
        isPasswordVisible={arePasswordsVisible}
        onChoose={() => onChoose("backup")}
      />
      <Pressable
        onPress={() => setArePasswordsVisible((visible) => !visible)}
        accessibilityRole="button"
      >
        <Text style={styles.link}>
          {arePasswordsVisible ? t.backup.hidePasswords : t.backup.showPasswords}
        </Text>
      </Pressable>
    </View>
  );
}

type VersionProps = {
  heading: string;
  chosenText: string;
  credential: Credential;
  path: string;
  // The other version. Details that differ from it stand out.
  other: Credential;
  otherPath: string;
  isChosen: boolean;
  isPasswordVisible: boolean;
  onChoose: () => void;
};

// One side of a conflict.
function Version({
  heading,
  chosenText,
  credential,
  path,
  other,
  otherPath,
  isChosen,
  isPasswordVisible,
  onChoose,
}: VersionProps) {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const detail = (isDifferent: boolean) => (isDifferent ? styles.differentDetail : styles.text);

  return (
    <Pressable
      onPress={onChoose}
      style={[styles.version, isChosen && styles.chosenVersion]}
      accessibilityRole="radio"
      accessibilityState={{ checked: isChosen }}
    >
      <View style={styles.versionHeader}>
        <Text style={styles.versionHeading}>{heading}</Text>
        {isChosen && <Icon name="check" color={colors.primary} size={20} />}
      </View>
      <Text style={detail(credential.title !== other.title)}>{credential.title}</Text>
      <Text style={detail(credential.username !== other.username)}>
        {credential.username ?? t.tree.noUsername}
      </Text>
      <Text style={detail(path !== otherPath)}>{path}</Text>
      <Text style={detail(credential.password !== other.password)}>
        {isPasswordVisible ? credential.password : "••••••••"}
      </Text>
      <Text style={styles.text}>
        {t.backup.changedOn(new Date(credential.updatedAt).toLocaleString())}
      </Text>
      {isChosen && <Text style={styles.chosenText}>{chosenText}</Text>}
    </Pressable>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    content: {
      padding: 16,
    },
    header: {
      gap: 8,
      marginBottom: 12,
    },
    title: {
      marginTop: 8,
      fontSize: 18,
      fontWeight: "600",
      color: colors.onSurface,
    },
    text: {
      color: colors.onSurfaceVariant,
    },
    error: {
      color: colors.error,
    },
    link: {
      fontSize: 16,
      color: colors.primary,
    },
    allButtons: {
      gap: 8,
    },
    conflict: {
      gap: 8,
      marginVertical: 8,
    },
    version: {
      gap: 2,
      padding: 12,
      borderWidth: 2,
      borderColor: colors.outlineVariant,
      borderRadius: 8,
    },
    chosenVersion: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceContainer,
    },
    versionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    versionHeading: {
      fontWeight: "600",
      color: colors.primary,
    },
    differentDetail: {
      fontWeight: "600",
      color: colors.onSurface,
    },
    chosenText: {
      marginTop: 4,
      fontWeight: "600",
      color: colors.primary,
    },
    footer: {
      gap: 12,
      marginTop: 16,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
    },
    restoreButton: {
      backgroundColor: colors.primary,
    },
    disabledButton: {
      opacity: 0.5,
    },
    restoreText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
  });
}
