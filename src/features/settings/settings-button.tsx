import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { Icon } from "@/components/icon";
import { useTranslation } from "@/i18n/use-translation";
import { useTheme } from "@/theme/use-theme";

// The settings button in the home screen's header. Opens the settings screen.
export function SettingsButton() {
  const t = useTranslation();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push("/settings")}
      hitSlop={8}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={t.settings.title}
    >
      <Icon name="settings" color={colors.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 4,
  },
});
