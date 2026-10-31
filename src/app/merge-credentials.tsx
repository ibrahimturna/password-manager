import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { useVault } from "@/data/vault-context";
import {
  getDistinctCredentials,
  getMergedInput,
} from "@/features/credentials/merge-credentials";
import { useKeptRoute } from "@/features/lock/use-kept-state";
import { useUndo } from "@/features/undo/undo-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";
import type { Credential } from "@/types/vault";

// Turns several selected passwords into one. The user picks the title to keep, and the username
// and password too when they differ, so nothing is dropped without being seen.
export default function MergeCredentialsScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { ids = "" } = useLocalSearchParams<{ ids: string }>();
  const { credentials, mergeCredentials } = useVault();
  const { offerUndo } = useUndo();
  useKeptRoute({ pathname: "/merge-credentials", params: { ids } });

  const selectedIds = ids.split(",");
  const selected = credentials.filter((credential) => selectedIds.includes(credential.id));
  const usernames = getDistinctCredentials(selected, (credential) => credential.username);
  const passwords = getDistinctCredentials(selected, (credential) => credential.password);

  const [keptId, setKeptId] = useState(selected[0]?.id);
  const [usernameId, setUsernameId] = useState(selected[0]?.id);
  const [passwordId, setPasswordId] = useState(selected[0]?.id);

  function find(id: string | undefined) {
    return selected.find((credential) => credential.id === id);
  }

  function merge() {
    const kept = find(keptId);
    const usernameFrom = find(usernameId);
    const passwordFrom = find(passwordId);
    if (kept === undefined || usernameFrom === undefined || passwordFrom === undefined) return;
    const undo = mergeCredentials(
      kept.id,
      getMergedInput(kept, usernameFrom, passwordFrom),
      selected.filter((credential) => credential.id !== kept.id).map((credential) => credential.id),
    );
    if (undo !== null) offerUndo(t.merge.merged(selected.length), undo);
    router.back();
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
    >
      <Text style={styles.note}>{t.merge.note}</Text>

      <Choices
        label={t.merge.titleToKeep}
        options={selected}
        chosenId={keptId}
        onChoose={setKeptId}
        getText={(credential) => credential.title}
      />
      {usernames.length > 1 && (
        <Choices
          label={t.merge.usernameToKeep}
          options={usernames}
          chosenId={find(usernameId)?.id}
          onChoose={setUsernameId}
          getText={(credential) => credential.username ?? t.tree.noUsername}
        />
      )}
      {passwords.length > 1 && (
        <Choices
          label={t.merge.passwordToKeep}
          options={passwords}
          chosenId={find(passwordId)?.id}
          onChoose={setPasswordId}
          // Passwords stay hidden, so each is named after the entry it comes from.
          getText={(credential) => t.merge.passwordFrom(credential.title)}
        />
      )}

      <View style={styles.buttons}>
        <Pressable onPress={() => router.back()} style={styles.button} accessibilityRole="button">
          <Text style={styles.cancelText}>{t.merge.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={merge}
          style={[styles.button, styles.mergeButton]}
          accessibilityRole="button"
        >
          <Text style={styles.mergeText}>{t.merge.merge}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

type ChoicesProps = {
  label: string;
  options: Credential[];
  chosenId: string | undefined;
  onChoose: (id: string) => void;
  getText: (credential: Credential) => string;
};

function Choices({ label, options, chosenId, onChoose, getText }: ChoicesProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View>
      <Text style={styles.sectionTitle}>{label}</Text>
      {options.map((option) => {
        const isChosen = option.id === chosenId;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChoose(option.id)}
            style={styles.row}
            accessibilityRole="radio"
            accessibilityState={{ selected: isChosen }}
          >
            <Icon
              name={isChosen ? "selected" : "notSelected"}
              color={isChosen ? colors.primary : colors.onSurfaceVariant}
            />
            <Text style={styles.rowText}>{getText(option)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    content: {
      gap: 16,
      padding: 16,
    },
    note: {
      color: colors.onSurfaceVariant,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.onSurface,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.outlineVariant,
    },
    rowText: {
      flex: 1,
      fontSize: 16,
      color: colors.onSurface,
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
    cancelText: {
      fontSize: 16,
      color: colors.primary,
    },
    mergeButton: {
      backgroundColor: colors.primary,
    },
    mergeText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
  });
}
