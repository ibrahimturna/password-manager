import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

// The ⚙️ button in the home screen's header. Opens the settings screen.
export function SettingsButton() {
  return (
    <Pressable
      onPress={() => router.push("/settings")}
      hitSlop={8}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Settings"
    >
      <Text style={styles.icon}>⚙️</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 4,
  },
  icon: {
    fontSize: 22,
  },
});
