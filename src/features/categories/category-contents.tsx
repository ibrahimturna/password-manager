import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { mockCategories, mockCredentials } from "@/data/mock-vault";
import type { Category, Credential } from "@/types/vault";

import { getChildCategories, getCredentialsInCategory } from "./category-tree";

// One row in the list is either a subcategory or a credential.
// The `kind` field tells TypeScript (and us) which one it is.
type ListItem =
  | { kind: "category"; category: Category }
  | { kind: "credential"; credential: Credential };

type CategoryContentsProps = {
  // null shows the top-level categories (the home screen).
  categoryId: string | null;
};

// Lists the subcategories and credentials directly inside a category.
export function CategoryContents({ categoryId }: CategoryContentsProps) {
  const subcategories = getChildCategories(mockCategories, categoryId);
  // Credentials always belong to a category, so the top level has none.
  const credentials =
    categoryId === null ? [] : getCredentialsInCategory(mockCredentials, categoryId);

  const items: ListItem[] = [
    ...subcategories.map((category): ListItem => ({ kind: "category", category })),
    ...credentials.map((credential): ListItem => ({ kind: "credential", credential })),
  ];

  return (
    <FlatList
      data={items}
      keyExtractor={(item) =>
        item.kind === "category" ? item.category.id : item.credential.id
      }
      renderItem={({ item }) =>
        item.kind === "category" ? (
          <CategoryRow category={item.category} />
        ) : (
          <CredentialRow credential={item.credential} />
        )
      }
      ListEmptyComponent={<Text style={styles.emptyText}>This category is empty.</Text>}
    />
  );
}

function CategoryRow({ category }: { category: Category }) {
  return (
    <Link href={{ pathname: "/category/[id]", params: { id: category.id } }} asChild>
      <Pressable style={styles.row}>
        <Text style={styles.rowTitle}>📁 {category.name}</Text>
      </Pressable>
    </Link>
  );
}

// Shows title and username only. The password is never rendered in a list.
function CredentialRow({ credential }: { credential: Credential }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>🔑 {credential.title}</Text>
      <Text style={styles.rowSubtitle}>{credential.username ?? "No username"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  rowTitle: {
    fontSize: 18,
  },
  rowSubtitle: {
    marginTop: 2,
    color: "#666",
  },
  emptyText: {
    paddingVertical: 24,
    textAlign: "center",
    color: "#666",
  },
});
