import type { Category, Credential } from "@/types/vault";

import {
  expandWithParents,
  getCategoryById,
  getCategoryPath,
  getChildCategories,
  getCredentialsInCategory,
  getDescendantIds,
  getSubtreeRows,
  getVisibleRows,
  toggleExpanded,
  type TreeRow,
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

describe("getVisibleRows", () => {
  // Turns rows into short, indented strings so expectations read like the tree itself:
  // "[+]" = collapsed category, "[-]" = expanded category, "*" = credential.
  function describeRows(rows: TreeRow[]): string[] {
    return rows.map((row) => {
      const indent = "  ".repeat(row.depth);
      switch (row.kind) {
        case "category":
          return `${indent}${row.isExpanded ? "[-]" : "[+]"} ${row.category.name}`;
        case "credential":
          return `${indent}* ${row.credential.title}`;
        case "empty":
          return `${indent}(empty)`;
      }
    });
  }

  function visibleRows(expandedIds: string[]): string[] {
    return describeRows(getVisibleRows(testCategories, testCredentials, new Set(expandedIds)));
  }

  it("shows only top-level categories when nothing is expanded", () => {
    expect(visibleRows([])).toEqual(["[+] Banks", "[+] Social", "[+] Empty"]);
  });

  it("shows subcategories first, then credentials, inside an expanded category", () => {
    expect(visibleRows(["banks"])).toEqual([
      "[-] Banks",
      "  [+] Investments",
      "  [+] Other",
      "  * bank-login",
      "  * second-bank-login",
      "[+] Social",
      "[+] Empty",
    ]);
  });

  it("shows deeply nested contents when every level is expanded", () => {
    expect(visibleRows(["banks", "investments", "stocks"])).toEqual([
      "[-] Banks",
      "  [-] Investments",
      "    [-] Stocks",
      "      * broker-login",
      "  [+] Other",
      "  * bank-login",
      "  * second-bank-login",
      "[+] Social",
      "[+] Empty",
    ]);
  });

  it("hides an expanded category when its parent is collapsed", () => {
    // "investments" is expanded, but its parent "banks" is not, so it stays hidden.
    expect(visibleRows(["investments"])).toEqual(["[+] Banks", "[+] Social", "[+] Empty"]);
  });

  it("shows an empty marker inside an expanded category with no contents", () => {
    expect(visibleRows(["empty"])).toEqual([
      "[+] Banks",
      "[+] Social",
      "[-] Empty",
      "  (empty)",
    ]);
  });

  it("ignores expanded ids that do not exist", () => {
    expect(visibleRows(["no-such-id"])).toEqual(["[+] Banks", "[+] Social", "[+] Empty"]);
  });

  it("returns no rows when there are no categories", () => {
    expect(getVisibleRows([], [], new Set())).toEqual([]);
  });
});

describe("getDescendantIds", () => {
  it("returns children and grandchildren at every depth", () => {
    expect(getDescendantIds(testCategories, "banks")).toEqual([
      "investments",
      "stocks",
      "banks-other",
    ]);
  });

  it("returns an empty list for a category without children", () => {
    expect(getDescendantIds(testCategories, "stocks")).toEqual([]);
  });

  it("does not loop forever when categories point at each other", () => {
    const loopingCategories: Category[] = [
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ];

    expect(getDescendantIds(loopingCategories, "a")).toEqual(["b"]);
  });
});

describe("toggleExpanded", () => {
  it("opens a closed category", () => {
    const result = toggleExpanded(new Set(), "banks", testCategories);

    expect([...result]).toEqual(["banks"]);
  });

  it("closes an open category", () => {
    const result = toggleExpanded(new Set(["banks", "social"]), "banks", testCategories);

    expect([...result]).toEqual(["social"]);
  });

  it("also closes every open category inside the one being closed", () => {
    const result = toggleExpanded(
      new Set(["banks", "investments", "stocks", "social"]),
      "banks",
      testCategories,
    );

    // "social" is in a different branch, so it stays open.
    expect([...result]).toEqual(["social"]);
  });

  it("does not change the Set it was given", () => {
    const original = new Set(["banks"]);

    const result = toggleExpanded(original, "banks", testCategories);

    expect(result).not.toBe(original); // a different object…
    expect([...original]).toEqual(["banks"]); // …and the original is untouched
  });
});

describe("getCategoryPath", () => {
  it("returns the category and its parents, from the top level down", () => {
    expect(ids(getCategoryPath(testCategories, "stocks"))).toEqual(["banks", "investments", "stocks"]);
  });

  it("returns only the category itself for a top-level category", () => {
    expect(ids(getCategoryPath(testCategories, "banks"))).toEqual(["banks"]);
  });

  it("returns an empty list for a missing category", () => {
    expect(getCategoryPath(testCategories, "missing")).toEqual([]);
  });

  it("stops instead of looping forever when categories point at each other", () => {
    const loop: Category[] = [
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ];

    expect(ids(getCategoryPath(loop, "a"))).toEqual(["b", "a"]);
  });
});

describe("expandWithParents", () => {
  it("opens the category and every category above it", () => {
    const result = expandWithParents(new Set(), "stocks", testCategories);

    expect([...result].sort()).toEqual(["banks", "investments", "stocks"]);
  });

  it("keeps categories that were already open", () => {
    const result = expandWithParents(new Set(["social"]), "investments", testCategories);

    expect([...result].sort()).toEqual(["banks", "investments", "social"]);
  });

  it("returns a new Set and does not change the original", () => {
    const original: ReadonlySet<string> = new Set();

    const result = expandWithParents(original, "banks", testCategories);

    expect(result).not.toBe(original);
    expect(original.size).toBe(0);
  });
});

describe("getSubtreeRows", () => {
  // Turns rows into short labels, so failures are easy to read.
  function labels(rows: TreeRow[]): string[] {
    return rows.map((row) => {
      switch (row.kind) {
        case "category":
          return `${row.depth}:category:${row.category.id}`;
        case "credential":
          return `${row.depth}:credential:${row.credential.id}`;
        case "empty":
          return `${row.depth}:empty:${row.parentId}`;
      }
    });
  }

  it("shows the category at depth 0 with everything inside it expanded", () => {
    const rows = getSubtreeRows(testCategories, testCredentials, "banks");

    expect(labels(rows)).toEqual([
      "0:category:banks",
      "1:category:investments",
      "2:category:stocks",
      "3:credential:broker-login",
      "1:category:banks-other",
      "2:empty:banks-other",
      "1:credential:bank-login",
      "1:credential:second-bank-login",
    ]);
  });

  it("starts from a nested category without showing its parents or siblings", () => {
    const rows = getSubtreeRows(testCategories, testCredentials, "investments");

    expect(labels(rows)).toEqual([
      "0:category:investments",
      "1:category:stocks",
      "2:credential:broker-login",
    ]);
  });

  it("shows an empty category with an empty row", () => {
    expect(labels(getSubtreeRows(testCategories, testCredentials, "empty"))).toEqual([
      "0:category:empty",
      "1:empty:empty",
    ]);
  });

  it("returns no rows for a missing category", () => {
    expect(getSubtreeRows(testCategories, testCredentials, "missing")).toEqual([]);
  });
});
