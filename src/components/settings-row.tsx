import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

type SettingsRowProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  // Without this the row only shows information and cannot be tapped.
  onPress?: () => void;
  // Shown at the end of the row, like a switch.
  children?: ReactNode;
};

// One line of the settings list: an icon, a title and an optional grey line below it.
export function SettingsRow({ icon, title, subtitle, onPress, children }: SettingsRowProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const content = (
    <>
      <Icon name={icon} color={colors.onSurfaceVariant} size={26} />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {children}
    </>
  );

  if (onPress === undefined) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

// Thin line between two groups of rows.
export function SettingsDivider() {
  const styles = createStyles(useTheme().colors);
  return <View style={styles.divider} />;
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 24,
      minHeight: 64,
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 18,
      color: colors.onSurface,
    },
    subtitle: {
      fontSize: 14,
      color: colors.onSurfaceVariant,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: 4,
      backgroundColor: colors.outline,
    },
  });
}
