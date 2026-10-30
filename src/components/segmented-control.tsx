import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

// A row of buttons where exactly one is selected, like a set of radio buttons.
// `T` is the type of the values (for example "create" | "rename"), so `onChange`
// can only ever receive one of the given values.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              index > 0 && styles.segmentDivider,
              isSelected && styles.segmentSelected,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            {isSelected && <Icon name="check" color={colors.onSecondaryContainer} size={18} />}
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Styles depend on the colours, so they are built from the active palette.
function createStyles(colors: Palette) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 20,
      overflow: "hidden",
    },
    segment: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
      paddingVertical: 10,
    },
    segmentDivider: {
      borderLeftWidth: 1,
      borderLeftColor: colors.outline,
    },
    segmentSelected: {
      backgroundColor: colors.secondaryContainer,
    },
    label: {
      fontSize: 15,
      color: colors.onSurface,
    },
    labelSelected: {
      color: colors.onSecondaryContainer,
      fontWeight: "600",
    },
  });
}
