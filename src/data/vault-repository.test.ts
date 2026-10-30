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

  it("creates a category with a generated id and returns it", () => {
    const repository = makeRepository();

    const created = repository.createCategory("Investments", "banks");

    expect(created).toEqual({ id: "new-1", name: "Investments", parentId: "banks" });
    expect(repository.getCategories()).toContainEqual(created);
  });

  it("gives each new category a different id", () => {
    const repository = makeRepository();

    const first = repository.createCategory("E-mail", null);
    const second = repository.createCategory("E-mail", "banks");

    expect(first.id).not.toBe(second.id);
  });

  it("returns a new categories array after a change", () => {
    const repository = makeRepository();
    const before = repository.getCategories();

    repository.renameCategory("banks", "Bank Accounts");
    const after = repository.getCategories();

    // A new array is what lets React notice the change.
    expect(after).not.toBe(before);
    expect(after[0].name).toBe("Bank Accounts");
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
