import type { Category } from "@/types/vault";

import { createInMemoryVaultRepository } from "./vault-repository";

const seedCategories: Category[] = [
  { id: "banks", name: "Banks", parentId: null },
  { id: "social", name: "Social", parentId: null },
];

describe("createInMemoryVaultRepository", () => {
  it("starts with the seed data", () => {
    const repository = createInMemoryVaultRepository({ categories: seedCategories, credentials: [] });

    expect(repository.getCategories()).toEqual(seedCategories);
    expect(repository.getCredentials()).toEqual([]);
  });

  it("returns a new categories array after a rename", () => {
    const repository = createInMemoryVaultRepository({ categories: seedCategories, credentials: [] });
    const before = repository.getCategories();

    repository.renameCategory("banks", "Bank Accounts");
    const after = repository.getCategories();

    // A new array is what lets React notice the change.
    expect(after).not.toBe(before);
    expect(after[0].name).toBe("Bank Accounts");
  });

  it("does not change the seed data", () => {
    const repository = createInMemoryVaultRepository({ categories: seedCategories, credentials: [] });

    repository.renameCategory("banks", "Bank Accounts");

    expect(seedCategories[0].name).toBe("Banks");
  });
});
