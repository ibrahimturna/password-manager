import type { Category } from "@/types/vault";

import {
  isSameCategoryName,
  MAX_CATEGORY_NAME_LENGTH,
  validateCategoryName,
} from "./category-name";

// Banks (root)
// └── Investments
// Social (root)
// └── Other
const testCategories: Category[] = [
  { id: "banks", name: "Banks", parentId: null },
  { id: "investments", name: "Investments", parentId: "banks" },
  { id: "social", name: "Social", parentId: null },
  { id: "social-other", name: "Other", parentId: "social" },
];

describe("isSameCategoryName", () => {
  it("ignores upper and lower case", () => {
    expect(isSameCategoryName("Banks", "bANKS")).toBe(true);
  });

  it("matches under English rules (I ↔ i)", () => {
    expect(isSameCategoryName("INSTAGRAM", "instagram")).toBe(true);
  });

  it("matches under Turkish rules (I ↔ ı and İ ↔ i)", () => {
    expect(isSameCategoryName("KIRMIZI", "kırmızı")).toBe(true);
    expect(isSameCategoryName("İnternet", "internet")).toBe(true);
  });

  it("handles the other Turkish letters (Ğ Ü Ş Ö Ç) the same way in both rules", () => {
    expect(isSameCategoryName("ĞÜŞÖÇ", "ğüşöç")).toBe(true);
    expect(isSameCategoryName("Şifreler", "şifreler")).toBe(true);
    expect(isSameCategoryName("Şifreler", "sifreler")).toBe(false);
  });

  it("does not match different names", () => {
    expect(isSameCategoryName("Banks", "Bank")).toBe(false);
    expect(isSameCategoryName("ışık", "isik")).toBe(false);
  });
});

describe("validateCategoryName", () => {
  it("accepts a new name and returns it trimmed", () => {
    expect(validateCategoryName(testCategories, "  E-mail  ", null, null)).toEqual({
      ok: true,
      name: "E-mail",
    });
  });

  it("rejects an empty name", () => {
    expect(validateCategoryName(testCategories, "", null, null)).toEqual({
      ok: false,
      error: "empty",
    });
  });

  it("rejects a name made only of spaces", () => {
    expect(validateCategoryName(testCategories, "   ", null, null)).toEqual({
      ok: false,
      error: "empty",
    });
  });

  it("accepts a name of exactly the maximum length", () => {
    const name = "a".repeat(MAX_CATEGORY_NAME_LENGTH);

    expect(validateCategoryName(testCategories, name, null, null)).toEqual({ ok: true, name });
  });

  it("rejects a name longer than the maximum length", () => {
    const name = "a".repeat(MAX_CATEGORY_NAME_LENGTH + 1);

    expect(validateCategoryName(testCategories, name, null, null)).toEqual({
      ok: false,
      error: "too-long",
    });
  });

  it("does not count spaces that get trimmed toward the length", () => {
    const name = ` ${"a".repeat(MAX_CATEGORY_NAME_LENGTH)} `;

    expect(validateCategoryName(testCategories, name, null, null).ok).toBe(true);
  });

  it("counts an emoji as one character", () => {
    const name = "🔑".repeat(MAX_CATEGORY_NAME_LENGTH);

    expect(validateCategoryName(testCategories, name, null, null).ok).toBe(true);
  });

  it("rejects a duplicate top-level name, ignoring case", () => {
    expect(validateCategoryName(testCategories, "BANKS", null, null)).toEqual({
      ok: false,
      error: "duplicate",
    });
  });

  it("rejects a duplicate name among subcategories", () => {
    expect(validateCategoryName(testCategories, "investments", "banks", null)).toEqual({
      ok: false,
      error: "duplicate",
    });
  });

  it("allows the same name in a different branch", () => {
    // "Other" already exists under Social, but not under Banks.
    expect(validateCategoryName(testCategories, "Other", "banks", null)).toEqual({
      ok: true,
      name: "Other",
    });
  });

  it("allows a subcategory to have the same name as a top-level category", () => {
    expect(validateCategoryName(testCategories, "Banks", "banks", null).ok).toBe(true);
  });

  it("allows renaming a category to its own name", () => {
    expect(validateCategoryName(testCategories, "Banks", null, "banks").ok).toBe(true);
  });

  it("allows renaming a category to change only its case", () => {
    expect(validateCategoryName(testCategories, "BANKS", null, "banks")).toEqual({
      ok: true,
      name: "BANKS",
    });
  });

  it("rejects renaming a category to a sibling's name", () => {
    expect(validateCategoryName(testCategories, "Social", null, "banks")).toEqual({
      ok: false,
      error: "duplicate",
    });
  });
});
