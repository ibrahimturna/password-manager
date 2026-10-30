import { Pressable, StyleSheet, Text, View } from "react-native";

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
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, isSelected && styles.segmentSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#208AEF",
    borderRadius: 8,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentSelected: {
    backgroundColor: "#208AEF",
  },
  label: {
    fontSize: 16,
    color: "#208AEF",
  },
  labelSelected: {
    color: "#fff",
  },
});
