import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppSwitch } from "@/components/app-switch";
import { Icon } from "@/components/icon";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import {
  type CharacterGroup,
  DEFAULT_GENERATOR_OPTIONS,
  generatePassword,
  type GeneratorOptions,
  MAX_GENERATED_LENGTH,
  MIN_GENERATED_LENGTH,
} from "./password-generator";

type PasswordGeneratorDialogProps = {
  onCancel: () => void;
  onUse: (password: string) => void;
};

const GROUP_ORDER: CharacterGroup[] = ["uppercase", "lowercase", "numbers", "symbols"];

// Makes a random password. Every change of the options makes a new one.
export function PasswordGeneratorDialog({ onCancel, onUse }: PasswordGeneratorDialogProps) {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_GENERATOR_OPTIONS);
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_GENERATOR_OPTIONS));
  const chosenCount = GROUP_ORDER.filter((group) => options[group]).length;

  function change(next: GeneratorOptions) {
    setOptions(next);
    setPassword(generatePassword(next));
  }

  function changeLength(by: number) {
    const length = Math.min(
      MAX_GENERATED_LENGTH,
      Math.max(MIN_GENERATED_LENGTH, options.length + by),
    );
    change({ ...options, length });
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.centered}>
        <Pressable style={styles.scrim} onPress={onCancel} accessible={false} />
        <View style={styles.card}>
          <Text style={styles.title}>{t.generator.title}</Text>

          <View style={styles.preview}>
            <Text style={styles.password} selectable>
              {password}
            </Text>
            <Pressable
              onPress={() => setPassword(generatePassword(options))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t.generator.another}
            >
              <Icon name="refresh" color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t.generator.length}</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => changeLength(-1)}
                disabled={options.length <= MIN_GENERATED_LENGTH}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t.generator.shorter}
              >
                <Icon name="remove" color={colors.primary} />
              </Pressable>
              <Text style={styles.length}>{options.length}</Text>
              <Pressable
                onPress={() => changeLength(1)}
                disabled={options.length >= MAX_GENERATED_LENGTH}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t.generator.longer}
              >
                <Icon name="add" color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {GROUP_ORDER.map((group) => (
            <View key={group} style={styles.row}>
              <Text style={styles.label}>{t.generator[group]}</Text>
              <AppSwitch
                value={options[group]}
                onValueChange={(on) => change({ ...options, [group]: on })}
                // At least one group stays on, so there is always something to draw from.
                disabled={options[group] && chosenCount === 1}
                accessibilityLabel={t.generator[group]}
              />
            </View>
          ))}

          <View style={styles.buttons}>
            <Pressable onPress={onCancel} style={styles.button} accessibilityRole="button">
              <Text style={styles.cancelText}>{t.generator.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={() => onUse(password)}
              style={[styles.button, styles.useButton]}
              accessibilityRole="button"
            >
              <Text style={styles.useText}>{t.generator.use}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
    },
    scrim: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: "rgba(0, 0, 0, 0.32)",
    },
    card: {
      padding: 24,
      gap: 12,
      borderRadius: 28,
      backgroundColor: colors.surfaceContainerHigh,
      elevation: 6,
    },
    title: {
      fontSize: 22,
      color: colors.onSurface,
    },
    preview: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
    },
    password: {
      flex: 1,
      fontSize: 18,
      fontFamily: "monospace", // every character the same width, so l, 1 and I are easier to tell apart
      color: colors.onSurface,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      fontSize: 16,
      color: colors.onSurface,
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    length: {
      minWidth: 28,
      textAlign: "center",
      fontSize: 16,
      color: colors.onSurface,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 4,
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
    useButton: {
      backgroundColor: colors.primary,
    },
    useText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
  });
}
