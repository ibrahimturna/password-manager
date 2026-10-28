import { FlatList, StyleSheet, Text, View } from "react-native";

import { mockCategories } from "@/data/mock-vault";

// Top-level categories are the ones without a parent.
const rootCategories = mockCategories.filter(
  (category) => category.parentId === null,
);

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.notice}>
        Mock data only — do not enter real passwords.
      </Text>

      <FlatList
        data={rootCategories}
        keyExtractor={(category) => category.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>{item.name}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  notice: {
    textAlign: "center",
    color: "#666",
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  rowText: {
    fontSize: 18,
  },
});
