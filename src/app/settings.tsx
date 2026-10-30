import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { SegmentedControl } from "@/components/segmented-control";
import { useVault } from "@/data/vault-context";
import { useExpandedFolders } from "@/features/folders/expanded-folders-context";
import { useSettings } from "@/features/settings/settings-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

export default function SettingsScreen() {
  const { language, theme, setLanguage, setTheme } = useSettings();
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);
  const { resetToSampleData } = useVault();
  const { collapseAll } = useExpandedFolders();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // For testing only; this goes away with the real vault in Milestone 7.
  function confirmReset() {
    setIsResetDialogOpen(false);
    resetToSampleData();
    collapseAll();
    router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settings.language}</Text>
        <SegmentedControl
          options={[
            { value: "device", label: t.settings.device },
            // Language names are always written in their own language, so they are not translated.
            { value: "tr", label: "Türkçe" },
            { value: "en", label: "English" },
          ]}
          value={language}
          onChange={setLanguage}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settings.theme}</Text>
        <SegmentedControl
          options={[
            { value: "device", label: t.settings.device },
            { value: "light", label: t.settings.light },
            { value: "dark", label: t.settings.dark },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </View>

      <Text style={styles.note}>{t.settings.mockNotice}</Text>

      <Pressable
        onPress={() => setIsResetDialogOpen(true)}
        style={styles.resetButton}
        accessibilityRole="button"
      >
        <Text style={styles.resetText}>{t.settings.resetSampleData}</Text>
      </Pressable>

      <ConfirmDialog
        visible={isResetDialogOpen}
        title={t.settings.resetTitle}
        message={t.settings.resetMessage}
        cancelLabel={t.settings.resetCancel}
        confirmLabel={t.settings.resetConfirm}
        onCancel={() => setIsResetDialogOpen(false)}
        onConfirm={confirmReset}
      />
    </ScrollView>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    content: {
      padding: 16,
      gap: 24,
    },
    section: {
      gap: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.onSurface,
    },
    note: {
      color: colors.onSurfaceVariant,
    },
    resetButton: {
      alignSelf: "flex-start",
      paddingVertical: 8,
    },
    resetText: {
      fontSize: 16,
      color: colors.error,
    },
  });
}
