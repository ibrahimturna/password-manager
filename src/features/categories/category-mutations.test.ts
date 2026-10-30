import type { Category, Credential } from "@/types/vault";

import {
  addCategory,
  deleteCategory,
  renameCategory,
  restoreDeletion,
} from "./category-mutations";

const testCategories: Category[] = [
  { id: "banks", name: "Banks", parentId: null },
  { id: "investments", name: "Investments", parentId: "banks" },
  { id: "social", name: "Social", parentId: null },
];

describe("addCategory", () => {
  it("adds a top-level category at the end", () => {
    const result = addCategory(testCategories, "email", "E-mail", null);

    expect(result).toHaveLength(4);
    expect(result[3]).toEqual({ id: "email", name: "E-mail", parentId: null });
  });

  it("adds a subcategory under the given parent", () => {
    const result = addCategory(testCategories, "stocks", "Stocks", "investments");

    expect(result[3]).toEqual({ id: "stocks", name: "Stocks", parentId: "investments" });
  });

  it("returns a new array and does not change the original", () => {
    const result = addCategory(testCategories, "email", "E-mail", null);

    expect(result).not.toBe(testCategories);
    expect(testCategories).toHaveLength(3);
  });
});

describe("renameCategory", () => {
  it("changes the name of the matching category only", () => {
    const result = renameCategory(testCategories, "investments", "Savings");

    expect(result).toEqual([
      { id: "banks", name: "Banks", parentId: null },
      { id: "investments", name: "Savings", parentId: "banks" },
      { id: "social", name: "Social", parentId: null },
    ]);
  });

  it("returns a new array and does not change the original", () => {
    const result = renameCategory(testCategories, "banks", "Bank Accounts");

    expect(result).not.toBe(testCategories);
    expect(testCategories[0].name).toBe("Banks");
  });

  it("leaves every category unchanged when the id does not exist", () => {
    const result = renameCategory(testCategories, "missing", "Anything");

    expect(result).toEqual(testCategories);
  });
});

// A deeper tree for the delete tests:
//
// Banks
// ├── Investments
// │   └── Stocks
// └── Cards
// Social
const deleteTestCategories: Category[] = [
  { id: "banks", name: "Banks", parentId: null },
  { id: "investments", name: "Investments", parentId: "banks" },
  { id: "social", name: "Social", parentId: null },
  { id: "stocks", name: "Stocks", parentId: "investments" },
  { id: "cards", name: "Cards", parentId: "banks" },
];

function makeCredential(id: string, categoryId: string): Credential {
  return {
    id,
    categoryId,
    title: id,
    username: null,
    password: "fake-password",
    createdAt: 0,
    updatedAt: 0,
  };
}

const deleteTestCredentials: Credential[] = [
  makeCredential("bank-login", "banks"),
  makeCredential("instagram", "social"),
  makeCredential("broker", "stocks"),
  makeCredential("card", "cards"),
];

function ids(items: { id: string }[]): string[] {
  return items.map((item) => item.id);
}

describe("deleteCategory", () => {
  it("removes the category, everything below it, and their credentials", () => {
    const result = deleteCategory(deleteTestCategories, deleteTestCredentials, "banks");

    expect(ids(result.categories)).toEqual(["social"]);
    expect(ids(result.credentials)).toEqual(["instagram"]);
  });

  it("leaves other branches untouched when deleting a nested category", () => {
    const result = deleteCategory(deleteTestCategories, deleteTestCredentials, "investments");

    expect(ids(result.categories)).toEqual(["banks", "social", "cards"]);
    expect(ids(result.credentials)).toEqual(["bank-login", "instagram", "card"]);
  });

  it("does not change the arrays it is given", () => {
    deleteCategory(deleteTestCategories, deleteTestCredentials, "banks");

    expect(deleteTestCategories).toHaveLength(5);
    expect(deleteTestCredentials).toHaveLength(4);
  });
});

describe("restoreDeletion", () => {
  it("puts everything back in its original order", () => {
    const { categories, credentials, deletion } = deleteCategory(
      deleteTestCategories,
      deleteTestCredentials,
      "banks",
    );

    const restored = restoreDeletion(categories, credentials, deletion);

    expect(restored.categories).toEqual(deleteTestCategories);
    expect(restored.credentials).toEqual(deleteTestCredentials);
  });

  it("restores a nested category to its original place", () => {
    const { categories, credentials, deletion } = deleteCategory(
      deleteTestCategories,
      deleteTestCredentials,
      "investments",
    );

    const restored = restoreDeletion(categories, credentials, deletion);

    expect(restored.categories).toEqual(deleteTestCategories);
    expect(restored.credentials).toEqual(deleteTestCredentials);
  });
});
