import { ScrollView, StyleSheet, Text, View } from "react-native";

import { SegmentedControl } from "@/components/segmented-control";
import { useSettings } from "@/features/settings/settings-context";

export default function SettingsScreen() {
  const { language, theme, setLanguage, setTheme } = useSettings();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <SegmentedControl
          options={[
            { value: "device", label: "Device" },
            // Language names are always written in their own language.
            { value: "tr", label: "Türkçe" },
            { value: "en", label: "English" },
          ]}
          value={language}
          onChange={setLanguage}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme</Text>
        <SegmentedControl
          options={[
            { value: "device", label: "Device" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </View>

      <Text style={styles.note}>
        Settings are not saved yet and reset to “Device” when the app restarts.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  },
  note: {
    color: "#666",
  },
});
