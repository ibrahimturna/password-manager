import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

type ChoiceDialogProps<T extends string> = {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  value: T;
  cancelLabel: string;
  onChoose: (value: T) => void;
  onCancel: () => void;
};

// Asks the user to pick one option. Choosing closes the dialog straight away.
export function ChoiceDialog<T extends string>({
  visible,
  title,
  options,
  value,
  cancelLabel,
  onChoose,
  onCancel,
}: ChoiceDialogProps<T>) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.centered}>
        <Pressable style={styles.scrim} onPress={onCancel} accessible={false} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <View>
            {options.map((option) => {
              const isChosen = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onChoose(option.value)}
                  style={styles.option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isChosen }}
                >
                  <Icon
                    name={isChosen ? "selected" : "notSelected"}
                    color={isChosen ? colors.primary : colors.onSurfaceVariant}
                  />
                  <Text style={styles.optionText}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={onCancel} style={styles.button} accessibilityRole="button">
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
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
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: 12,
    },
    optionText: {
      fontSize: 16,
      color: colors.onSurface,
    },
    button: {
      alignSelf: "flex-end",
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    cancelText: {
      fontSize: 16,
      color: colors.primary,
    },
  });
}
