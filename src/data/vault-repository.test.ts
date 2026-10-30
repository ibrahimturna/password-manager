import type { Category } from "@/types/vault";

import { createInMemoryVaultRepository } from "./vault-repository";

const seedCategories: Category[] = [
  { id: "banks", name: "Banks", parentId: null },
  { id: "social", name: "Social", parentId: null },
];

// Returns "new-1", "new-2", ... so tests know exactly which ids to expect.
function makeIdGenerator() {
  let count = 0;
  return () => {
    count += 1;
    return `new-${count}`;
  };
}

function makeRepository() {
  return createInMemoryVaultRepository(
    { categories: seedCategories, credentials: [] },
    makeIdGenerator(),
  );
}

describe("createInMemoryVaultRepository", () => {
  it("starts with the seed data", () => {
    const repository = makeRepository();

    expect(repository.getCategories()).toEqual(seedCategories);
    expect(repository.getCredentials()).toEqual([]);
  });

  describe("createCategory", () => {
    it("creates a category with a generated id and returns it", () => {
      const repository = makeRepository();

      const result = repository.createCategory("Investments", "banks");

      const expected = { id: "new-1", name: "Investments", parentId: "banks" };
      expect(result).toEqual({ ok: true, category: expected });
      expect(repository.getCategories()).toContainEqual(expected);
    });

    it("stores the trimmed name", () => {
      const repository = makeRepository();

      repository.createCategory("  E-mail  ", null);

      expect(repository.getCategories()).toContainEqual({
        id: "new-1",
        name: "E-mail",
        parentId: null,
      });
    });

    it("gives each new category a different id", () => {
      const repository = makeRepository();

      const first = repository.createCategory("E-mail", null);
      const second = repository.createCategory("E-mail", "banks");

      expect(first.ok && second.ok && first.category.id !== second.category.id).toBe(true);
    });

    it("rejects an invalid name and stores nothing", () => {
      const repository = makeRepository();
      const before = repository.getCategories();

      const result = repository.createCategory("banks", null);

      expect(result).toEqual({ ok: false, error: "duplicate" });
      expect(repository.getCategories()).toBe(before);
    });

    it("throws when the parent does not exist", () => {
      const repository = makeRepository();

      expect(() => repository.createCategory("Anything", "missing")).toThrow();
    });
  });

  describe("renameCategory", () => {
    it("renames and returns a new categories array", () => {
      const repository = makeRepository();
      const before = repository.getCategories();

      const result = repository.renameCategory("banks", "  Bank Accounts ");
      const after = repository.getCategories();

      expect(result).toEqual({ ok: true });
      // A new array is what lets React notice the change.
      expect(after).not.toBe(before);
      expect(after[0].name).toBe("Bank Accounts");
    });

    it("rejects an invalid name and changes nothing", () => {
      const repository = makeRepository();
      const before = repository.getCategories();

      const result = repository.renameCategory("banks", "   ");

      expect(result).toEqual({ ok: false, error: "empty" });
      expect(repository.getCategories()).toBe(before);
    });

    it("throws when the category does not exist", () => {
      const repository = makeRepository();

      expect(() => repository.renameCategory("missing", "Anything")).toThrow();
    });
  });

  it("does not change the seed data", () => {
    const repository = makeRepository();

    repository.renameCategory("banks", "Bank Accounts");
    repository.createCategory("E-mail", null);

    expect(seedCategories).toEqual([
      { id: "banks", name: "Banks", parentId: null },
      { id: "social", name: "Social", parentId: null },
    ]);
  });
});
