import type { Credential, Folder } from "@/types/vault";

import { normalizeForSearch, searchVault } from "./search";

// Bankalar (root)
// └── Yatırım
//     └── Borsa          <- holds "Aracı Kurum"
// Sosyal (root)          <- holds "Instagram"
// İnternet (root)        <- holds "Ev Wi-Fi"
const testFolders: Folder[] = [
  { id: "banks", name: "Bankalar", parentId: null },
  { id: "investments", name: "Yatırım", parentId: "banks" },
  { id: "stocks", name: "Borsa", parentId: "investments" },
  { id: "social", name: "Sosyal", parentId: null },
  { id: "internet", name: "İnternet", parentId: null },
];

function makeCredential(
  id: string,
  folderId: string,
  title: string,
  username: string | null,
): Credential {
  return {
    id,
    folderId,
    title,
    username,
    password: "gizli-sifre",
    createdAt: 0,
    updatedAt: 0,
  };
}

const testCredentials: Credential[] = [
  makeCredential("broker", "stocks", "Aracı Kurum", "yatirimci"),
  makeCredential("instagram", "social", "Instagram", "demo.insta"),
  makeCredential("wifi", "internet", "Ev Wi-Fi", null),
];

function sorted(ids: ReadonlySet<string> | undefined): string[] {
  return [...(ids ?? [])].sort();
}

describe("normalizeForSearch", () => {
  it("ignores case under English and Turkish rules", () => {
    expect(normalizeForSearch("INSTAGRAM")).toBe(normalizeForSearch("instagram"));
    expect(normalizeForSearch("İnternet")).toBe(normalizeForSearch("internet"));
    expect(normalizeForSearch("KIRMIZI")).toBe(normalizeForSearch("kırmızı"));
  });

  it("treats Turkish letters like their plain versions", () => {
    expect(normalizeForSearch("Çğıöşü ÇĞÖŞÜ")).toBe("cgiosu cgosu");
  });
});

describe("searchVault", () => {
  it("returns null for an empty or space-only query", () => {
    expect(searchVault(testFolders, testCredentials, "")).toBeNull();
    expect(searchVault(testFolders, testCredentials, "   ")).toBeNull();
  });

  it("finds a credential by title and opens every folder down to it", () => {
    const result = searchVault(testFolders, testCredentials, "kurum");

    expect(sorted(result?.credentialIds)).toEqual(["broker"]);
    expect(sorted(result?.folderIds)).toEqual(["banks", "investments", "stocks"]);
    // Including the credential's own folder.
    expect(sorted(result?.expandedIds)).toEqual(["banks", "investments", "stocks"]);
  });

  it("finds a credential by username", () => {
    const result = searchVault(testFolders, testCredentials, "demo.insta");

    expect(sorted(result?.credentialIds)).toEqual(["instagram"]);
    expect(sorted(result?.folderIds)).toEqual(["social"]);
  });

  it("finds Turkish names when typed without Turkish letters", () => {
    expect(sorted(searchVault(testFolders, testCredentials, "araci")?.credentialIds)).toEqual([
      "broker",
    ]);
    expect(sorted(searchVault(testFolders, testCredentials, "INTERNET")?.folderIds)).toContain(
      "internet",
    );
  });

  it("matches anywhere in the name", () => {
    expect(sorted(searchVault(testFolders, testCredentials, "gram")?.credentialIds)).toEqual([
      "instagram",
    ]);
  });

  it("never searches passwords", () => {
    const result = searchVault(testFolders, testCredentials, "gizli");

    expect(sorted(result?.folderIds)).toEqual([]);
    expect(sorted(result?.credentialIds)).toEqual([]);
  });

  it("shows a matching folder together with everything inside it", () => {
    const result = searchVault(testFolders, testCredentials, "yatır");

    expect(sorted(result?.folderIds)).toEqual(["banks", "investments", "stocks"]);
    // "broker" matches too (username "yatirimci"), so its folders open.
    expect(sorted(result?.credentialIds)).toEqual(["broker"]);
  });

  it("does not open a matching folder when nothing inside it matches", () => {
    const result = searchVault(testFolders, testCredentials, "borsa");

    expect(sorted(result?.folderIds)).toEqual(["banks", "investments", "stocks"]);
    expect(sorted(result?.credentialIds)).toEqual(["broker"]);
    expect(sorted(result?.expandedIds)).toEqual(["banks", "investments"]);
  });

  it("finds nothing when nothing matches", () => {
    const result = searchVault(testFolders, testCredentials, "xyz");

    expect(result).toEqual({
      folderIds: new Set(),
      credentialIds: new Set(),
      expandedIds: new Set(),
    });
  });
});
