import type { Category } from "@/types/vault";

import { renameCategory } from "./category-mutations";

const testCategories: Category[] = [
  { id: "banks", name: "Banks", parentId: null },
  { id: "investments", name: "Investments", parentId: "banks" },
  { id: "social", name: "Social", parentId: null },
];

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
