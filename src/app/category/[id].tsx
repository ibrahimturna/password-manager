import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { mockCategories } from "@/data/mock-vault";
import { CategoryContents } from "@/features/categories/category-contents";
import { getCategoryById } from "@/features/categories/category-tree";

// Route: /category/<id>. The `[id]` in the file name becomes the `id` parameter.
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = getCategoryById(mockCategories, id);

  if (category === undefined) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.message}>Category not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: category.name }} />
      <CategoryContents categoryId={category.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  message: {
    paddingVertical: 24,
    textAlign: "center",
    color: "#666",
  },
});
