import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  type AutofillTarget,
  getInstalledApps,
  getWebsiteTarget,
} from "../../modules/password-autofill";

import { Icon } from "@/components/icon";
import { useVault } from "@/data/vault-context";
import {
  filterApps,
  getLinkedTargets,
  getTargetLabel,
} from "@/features/autofill/autofill-rules";
import { useKeptRoute } from "@/features/lock/use-kept-state";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

// Shows which apps and websites a password fills, and lets the user add or remove them.
// Changes save straight away, like the links autofill remembers by itself.
export default function AutofillLinksScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { credentialId = "" } = useLocalSearchParams<{ credentialId: string }>();
  const { autofillLinks, addAutofillLink, removeAutofillLink } = useVault();
  useKeptRoute({ pathname: "/autofill-links", params: { credentialId } });

  const [apps, setApps] = useState<AutofillTarget[]>([]);
  const [website, setWebsite] = useState("");
  const [isWebsiteWrong, setIsWebsiteWrong] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getInstalledApps().then(setApps, () => setApps([]));
  }, []);

  const linked = getLinkedTargets(autofillLinks, credentialId);

  function addWebsite() {
    const target = getWebsiteTarget(website);
    if (target === null) {
      setIsWebsiteWrong(true);
      return;
    }
    addAutofillLink(target.key, credentialId);
    setWebsite("");
  }

  const header = (
    <View style={styles.header}>
      <Text style={styles.sectionTitle}>{t.autofillLinks.linked}</Text>
      {linked.length === 0 && <Text style={styles.text}>{t.autofillLinks.none}</Text>}
      {linked.map((key) => (
        <View key={key} style={styles.row}>
          <Text style={styles.rowText}>{getTargetLabel(key, apps)}</Text>
          <Pressable
            onPress={() => removeAutofillLink(key, credentialId)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t.autofillLinks.remove(getTargetLabel(key, apps))}
          >
            <Icon name="delete" color={colors.error} />
          </Pressable>
        </View>
      ))}

      <Text style={styles.sectionTitle}>{t.autofillLinks.addWebsite}</Text>
      <View style={styles.addRow}>
        <TextInput
          value={website}
          onChangeText={(text) => {
            setWebsite(text);
            setIsWebsiteWrong(false);
          }}
          onSubmitEditing={addWebsite}
          placeholder={t.autofillLinks.websitePlaceholder}
          placeholderTextColor={colors.onSurfaceVariant}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          importantForAutofill="no"
          style={[styles.input, styles.addInput]}
          accessibilityLabel={t.autofillLinks.addWebsite}
        />
        <Pressable onPress={addWebsite} style={styles.addButton} accessibilityRole="button">
          <Text style={styles.addText}>{t.autofillLinks.add}</Text>
        </Pressable>
      </View>
      {isWebsiteWrong && <Text style={styles.error}>{t.autofillLinks.websiteWrong}</Text>}

      <Text style={styles.sectionTitle}>{t.autofillLinks.addApp}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t.home.searchPlaceholder}
        placeholderTextColor={colors.onSurfaceVariant}
        autoCorrect={false}
        importantForAutofill="no"
        style={styles.input}
        accessibilityLabel={t.autofillLinks.addApp}
      />
    </View>
  );

  return (
    <FlatList
      data={filterApps(apps, linked, query)}
      keyExtractor={(app) => app.key}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => addAutofillLink(item.key, credentialId)}
          style={styles.row}
          accessibilityRole="button"
        >
          <Text style={styles.rowText}>{item.label}</Text>
          <Icon name="add" color={colors.primary} />
        </Pressable>
      )}
    />
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    content: {
      padding: 16,
    },
    header: {
      gap: 8,
    },
    sectionTitle: {
      marginTop: 16,
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
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    input: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 8,
      fontSize: 16,
      color: colors.onSurface,
    },
    addInput: {
      flex: 1,
    },
    addButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
      backgroundColor: colors.primary,
    },
    addText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
  });
}
