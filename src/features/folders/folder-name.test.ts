import type { Folder } from "@/types/vault";

import {
  isSameFolderName,
  MAX_FOLDER_NAME_LENGTH,
  validateFolderName,
} from "./folder-name";

// Banks (root)
// └── Investments
// Social (root)
// └── Other
const testFolders: Folder[] = [
  { id: "banks", name: "Banks", parentId: null },
  { id: "investments", name: "Investments", parentId: "banks" },
  { id: "social", name: "Social", parentId: null },
  { id: "social-other", name: "Other", parentId: "social" },
];

describe("isSameFolderName", () => {
  it("ignores upper and lower case", () => {
    expect(isSameFolderName("Banks", "bANKS")).toBe(true);
  });

  it("matches under English rules (I ↔ i)", () => {
    expect(isSameFolderName("INSTAGRAM", "instagram")).toBe(true);
  });

  it("matches under Turkish rules (I ↔ ı and İ ↔ i)", () => {
    expect(isSameFolderName("KIRMIZI", "kırmızı")).toBe(true);
    expect(isSameFolderName("İnternet", "internet")).toBe(true);
  });

  it("handles the other Turkish letters (Ğ Ü Ş Ö Ç) the same way in both rules", () => {
    expect(isSameFolderName("ĞÜŞÖÇ", "ğüşöç")).toBe(true);
    expect(isSameFolderName("Şifreler", "şifreler")).toBe(true);
    expect(isSameFolderName("Şifreler", "sifreler")).toBe(false);
  });

  it("does not match different names", () => {
    expect(isSameFolderName("Banks", "Bank")).toBe(false);
    expect(isSameFolderName("ışık", "isik")).toBe(false);
  });
});

describe("validateFolderName", () => {
  it("accepts a new name and returns it trimmed", () => {
    expect(validateFolderName(testFolders, "  E-mail  ", null, null)).toEqual({
      ok: true,
      name: "E-mail",
    });
  });

  it("rejects an empty name", () => {
    expect(validateFolderName(testFolders, "", null, null)).toEqual({
      ok: false,
      error: "empty",
    });
  });

  it("rejects a name made only of spaces", () => {
    expect(validateFolderName(testFolders, "   ", null, null)).toEqual({
      ok: false,
      error: "empty",
    });
  });

  it("accepts a name of exactly the maximum length", () => {
    const name = "a".repeat(MAX_FOLDER_NAME_LENGTH);

    expect(validateFolderName(testFolders, name, null, null)).toEqual({ ok: true, name });
  });

  it("rejects a name longer than the maximum length", () => {
    const name = "a".repeat(MAX_FOLDER_NAME_LENGTH + 1);

    expect(validateFolderName(testFolders, name, null, null)).toEqual({
      ok: false,
      error: "too-long",
    });
  });

  it("does not count spaces that get trimmed toward the length", () => {
    const name = ` ${"a".repeat(MAX_FOLDER_NAME_LENGTH)} `;

    expect(validateFolderName(testFolders, name, null, null).ok).toBe(true);
  });

  it("counts an emoji as one character", () => {
    const name = "🔑".repeat(MAX_FOLDER_NAME_LENGTH);

    expect(validateFolderName(testFolders, name, null, null).ok).toBe(true);
  });

  it("rejects a duplicate top-level name, ignoring case", () => {
    expect(validateFolderName(testFolders, "BANKS", null, null)).toEqual({
      ok: false,
      error: "duplicate",
    });
  });

  it("rejects a duplicate name among subfolders", () => {
    expect(validateFolderName(testFolders, "investments", "banks", null)).toEqual({
      ok: false,
      error: "duplicate",
    });
  });

  it("allows the same name in a different branch", () => {
    // "Other" already exists under Social, but not under Banks.
    expect(validateFolderName(testFolders, "Other", "banks", null)).toEqual({
      ok: true,
      name: "Other",
    });
  });

  it("allows a subfolder to have the same name as a top-level folder", () => {
    expect(validateFolderName(testFolders, "Banks", "banks", null).ok).toBe(true);
  });

  it("allows renaming a folder to its own name", () => {
    expect(validateFolderName(testFolders, "Banks", null, "banks").ok).toBe(true);
  });

  it("allows renaming a folder to change only its case", () => {
    expect(validateFolderName(testFolders, "BANKS", null, "banks")).toEqual({
      ok: true,
      name: "BANKS",
    });
  });

  it("rejects renaming a folder to a sibling's name", () => {
    expect(validateFolderName(testFolders, "Social", null, "banks")).toEqual({
      ok: false,
      error: "duplicate",
    });
  });
});
