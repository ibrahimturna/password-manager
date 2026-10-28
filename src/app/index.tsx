import { StyleSheet, Text, View } from "react-native";

import { CategoryContents } from "@/features/categories/category-contents";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.notice}>
        Mock data only — do not enter real passwords.
      </Text>

      <CategoryContents categoryId={null} />
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
});
