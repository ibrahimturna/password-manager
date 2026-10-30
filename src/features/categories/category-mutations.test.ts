import type { Category } from "@/types/vault";

import { addCategory, renameCategory } from "./category-mutations";

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
