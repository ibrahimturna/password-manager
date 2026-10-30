import { ScrollView, StyleSheet, Text, View } from "react-native";

import { SegmentedControl } from "@/components/segmented-control";
import { useSettings } from "@/features/settings/settings-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

export default function SettingsScreen() {
  const { language, theme, setLanguage, setTheme } = useSettings();
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);

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

      <Text style={styles.note}>{t.settings.notSavedNote}</Text>
      <Text style={styles.note}>{t.settings.mockNotice}</Text>
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
  });
}
