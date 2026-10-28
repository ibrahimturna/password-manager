import type { Category, Credential } from "@/types/vault";

import {
  getCategoryById,
  getChildCategories,
  getCredentialsInCategory,
} from "./category-tree";

// Small, hand-made tree used only by these tests:
//
// Banks (root)
// ├── Investments
// │   └── Stocks
// └── Other
// Social (root)
// └── Other          <- same name as Banks › Other, different branch
// Empty (root)       <- has no children
const testCategories: Category[] = [
  { id: "banks", name: "Banks", parentId: null },
  { id: "investments", name: "Investments", parentId: "banks" },
  { id: "stocks", name: "Stocks", parentId: "investments" },
  { id: "banks-other", name: "Other", parentId: "banks" },
  { id: "social", name: "Social", parentId: null },
  { id: "social-other", name: "Other", parentId: "social" },
  { id: "empty", name: "Empty", parentId: null },
];

// Helper: compare by id so failures print short, readable lists.
function ids(categories: Category[]): string[] {
  return categories.map((category) => category.id);
}

describe("getChildCategories", () => {
  it("returns top-level categories when parentId is null", () => {
    const result = getChildCategories(testCategories, null);

    expect(ids(result)).toEqual(["banks", "social", "empty"]);
  });

  it("returns only direct children, not grandchildren", () => {
    const result = getChildCategories(testCategories, "banks");

    // "stocks" is inside "investments", so it must not appear here.
    expect(ids(result)).toEqual(["investments", "banks-other"]);
  });

  it("returns children of a deeply nested category", () => {
    const result = getChildCategories(testCategories, "investments");

    expect(ids(result)).toEqual(["stocks"]);
  });

  it("keeps categories with the same name apart when they are in different branches", () => {
    const result = getChildCategories(testCategories, "social");

    expect(ids(result)).toEqual(["social-other"]);
  });

  it("returns an empty list for a category without children", () => {
    expect(getChildCategories(testCategories, "empty")).toEqual([]);
  });

  it("returns an empty list for an id that does not exist", () => {
    expect(getChildCategories(testCategories, "no-such-id")).toEqual([]);
  });

  it("returns an empty list when there are no categories at all", () => {
    expect(getChildCategories([], null)).toEqual([]);
  });
});

describe("getCategoryById", () => {
  it("finds a top-level category", () => {
    expect(getCategoryById(testCategories, "banks")?.name).toBe("Banks");
  });

  it("finds a deeply nested category", () => {
    expect(getCategoryById(testCategories, "stocks")?.name).toBe("Stocks");
  });

  it("returns undefined for an id that does not exist", () => {
    expect(getCategoryById(testCategories, "no-such-id")).toBeUndefined();
  });
});

describe("getCredentialsInCategory", () => {
  // Builds a credential with only the fields these tests care about.
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

  const testCredentials: Credential[] = [
    makeCredential("bank-login", "banks"),
    makeCredential("broker-login", "stocks"),
    makeCredential("second-bank-login", "banks"),
  ];

  it("returns all credentials stored directly in the category", () => {
    const result = getCredentialsInCategory(testCredentials, "banks");

    expect(result.map((credential) => credential.id)).toEqual([
      "bank-login",
      "second-bank-login",
    ]);
  });

  it("does not include credentials from subcategories", () => {
    // "broker-login" lives in "stocks", which is inside "banks" › "investments".
    const result = getCredentialsInCategory(testCredentials, "banks");

    expect(result.map((credential) => credential.id)).not.toContain("broker-login");
  });

  it("returns an empty list for a category without credentials", () => {
    expect(getCredentialsInCategory(testCredentials, "empty")).toEqual([]);
  });
});
