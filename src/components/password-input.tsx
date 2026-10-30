import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Icon } from "@/components/icon";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

type PasswordInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  label: string; // for screen readers
  showLabel: string;
  hideLabel: string;
  maxLength?: number;
  editable?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  // Extra buttons after the eye button, e.g. copy.
  children?: ReactNode;
};

// A password field, hidden by default, with an eye button to show or hide it.
// The border is on the wrapper, so the input's own style never changes after it appears:
// on Android, changing an input's background later resets its padding.
export function PasswordInput({
  value,
  onChangeText,
  label,
  showLabel,
  hideLabel,
  maxLength,
  editable,
  autoFocus,
  onSubmitEditing,
  children,
}: PasswordInputProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.field}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!isVisible}
        maxLength={maxLength}
        editable={editable}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        // Other password managers should not offer to save these.
        importantForAutofill="no"
        selectionColor={colors.primary}
        style={styles.input}
        accessibilityLabel={label}
      />
      <Pressable
        onPress={() => setIsVisible((visible) => !visible)}
        hitSlop={8}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={isVisible ? hideLabel : showLabel}
      >
        <Icon name={isVisible ? "hide" : "show"} color={colors.onSurfaceVariant} />
      </Pressable>
      {children}
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    field: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 4,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    input: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 18,
      color: colors.onSurface,
    },
    button: {
      padding: 8,
    },
  });
}
