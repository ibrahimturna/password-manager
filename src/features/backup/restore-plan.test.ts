import { createInMemoryVaultRepository, type VaultContents } from "@/data/vault-repository";
import type { Credential } from "@/types/vault";

import {
  applyRestorePlan,
  createRestorePlan,
  getRestoreTree,
  type RestoreChoice,
} from "./restore-plan";

function makeCredential(overrides: Partial<Credential>): Credential {
  return {
    id: "c1",
    folderId: "f1",
    title: "Bank",
    username: "me",
    password: "one",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeRepository(seed: VaultContents) {
  let count = 0;
  return createInMemoryVaultRepository(
    seed,
    () => {
      count += 1;
      return `new-${count}`;
    },
    () => 1000,
  );
}

const banks = { id: "f1", name: "Banks", parentId: null };

function restore(
  phone: VaultContents,
  backup: VaultContents,
  choices: [string, RestoreChoice][] = [],
) {
  const repository = makeRepository(phone);
  const result = applyRestorePlan(repository, createRestorePlan(phone, backup), new Map(choices));
  return { repository, result };
}

describe("createRestorePlan", () => {
  it("finds nothing to do when both sides are identical", () => {
    const vault = { folders: [banks], credentials: [makeCredential({})] };
    const plan = createRestorePlan(vault, vault);
    expect(plan.newFolders).toEqual([]);
    expect(plan.newCredentials).toEqual([]);
    expect(plan.conflicts).toEqual([]);
    expect(plan.sameCount).toBe(1);
  });

  it("matches folders by place and name, ignoring case and ids", () => {
    const phone = { folders: [banks], credentials: [] };
    const backup = { folders: [{ ...banks, id: "other", name: "BANKS" }], credentials: [] };
    const plan = createRestorePlan(phone, backup);
    expect(plan.newFolders).toEqual([]);
    expect(plan.matchingFolders.get("other")).toBe("f1");
  });

  it("treats the same name in another place as a new folder", () => {
    const parent = { id: "p", name: "Work", parentId: null };
    const nested = { id: "n", name: "Banks", parentId: "p" };
    const plan = createRestorePlan(
      { folders: [banks], credentials: [] },
      { folders: [parent, nested], credentials: [] },
    );
    expect(plan.newFolders).toEqual([parent, nested]);
  });

  it("recognises a credential from another phone by folder, title and username", () => {
    const phone = { folders: [banks], credentials: [makeCredential({})] };
    const backup = {
      folders: [{ ...banks, id: "other" }],
      credentials: [makeCredential({ id: "c9", folderId: "other" })],
    };
    expect(createRestorePlan(phone, backup).sameCount).toBe(1);
  });

  it("reports a different password as a conflict", () => {
    const phone = { folders: [banks], credentials: [makeCredential({})] };
    const backup = { folders: [banks], credentials: [makeCredential({ password: "two" })] };
    expect(createRestorePlan(phone, backup).conflicts).toHaveLength(1);
  });

  it("reports the same id with a new title as a conflict", () => {
    const phone = { folders: [banks], credentials: [makeCredential({})] };
    const backup = { folders: [banks], credentials: [makeCredential({ title: "New" })] };
    expect(createRestorePlan(phone, backup).conflicts).toHaveLength(1);
  });

  it("compares a phone credential only once", () => {
    const phone = { folders: [banks], credentials: [makeCredential({})] };
    const backup = {
      folders: [banks],
      credentials: [makeCredential({ id: "a" }), makeCredential({ id: "b" })],
    };
    const plan = createRestorePlan(phone, backup);
    expect(plan.sameCount).toBe(1);
    expect(plan.newCredentials).toHaveLength(1);
  });
});

describe("getRestoreTree", () => {
  const work = { id: "w", name: "Work", parentId: null };
  const mail = { id: "m", name: "Mail", parentId: "w" };

  it("marks each credential and opens the folders that hold changes", () => {
    const phone = {
      folders: [banks, work],
      credentials: [makeCredential({}), makeCredential({ id: "c2", title: "Same", folderId: "w" })],
    };
    const backup = {
      folders: [banks, work, mail],
      credentials: [
        makeCredential({ password: "two" }),
        makeCredential({ id: "c2", title: "Same", folderId: "w" }),
        makeCredential({ id: "c3", title: "New", folderId: "m" }),
      ],
    };

    const tree = getRestoreTree(createRestorePlan(phone, backup), backup.folders);

    expect(tree.credentialStatuses.get("c1")).toBe("conflict");
    expect(tree.credentialStatuses.get("c2")).toBeUndefined();
    expect(tree.credentialStatuses.get("c3")).toBe("new");
    expect(tree.newFolderIds).toEqual(new Set(["m"]));
    expect(tree.openFolderIds).toEqual(new Set(["f1", "w", "m"]));
  });

  it("keeps folders closed when nothing would change", () => {
    const vault = { folders: [banks], credentials: [makeCredential({})] };
    const tree = getRestoreTree(createRestorePlan(vault, vault), vault.folders);
    expect(tree.openFolderIds.size).toBe(0);
  });
});

describe("applyRestorePlan", () => {
  it("reports a password edited after the backup and leaves it alone without a choice", () => {
    const backup = { folders: [banks], credentials: [makeCredential({})] };
    const repository = makeRepository(backup);
    repository.updateCredential("c1", {
      folderId: "f1",
      title: "Bank",
      username: "me",
      password: "edited",
    });
    const phone = {
      folders: repository.getFolders(),
      credentials: repository.getCredentials(),
    };

    const plan = createRestorePlan(phone, backup);
    const result = applyRestorePlan(repository, plan, new Map());

    expect(plan.conflicts).toHaveLength(1);
    expect(result.updated).toBe(0);
    expect(repository.getCredentials()[0].password).toBe("edited");
  });

  it("adds new folders and credentials without touching existing ones", () => {
    const phone = { folders: [banks], credentials: [makeCredential({})] };
    const parent = { id: "p", name: "Work", parentId: null };
    const child = { id: "k", name: "Mail", parentId: "p" };
    const backup = {
      folders: [parent, child],
      credentials: [makeCredential({ id: "c2", folderId: "k", title: "Mail" })],
    };

    const { repository, result } = restore(phone, backup);

    expect(result).toEqual({ added: 1, updated: 0, failed: 0 });
    const folders = repository.getFolders();
    expect(folders).toHaveLength(3);
    const mail = folders.find((folder) => folder.name === "Mail");
    expect(mail?.parentId).toBe(folders.find((folder) => folder.name === "Work")?.id);
    const added = repository.getCredentials().find((item) => item.title === "Mail");
    expect(added?.folderId).toBe(mail?.id);
    expect(repository.getCredentials()[0]).toEqual(makeCredential({}));
  });

  it("keeps the phone's version unless the backup was chosen", () => {
    const phone = { folders: [banks], credentials: [makeCredential({})] };
    const backup = { folders: [banks], credentials: [makeCredential({ password: "two" })] };

    const { repository, result } = restore(phone, backup);

    expect(result.updated).toBe(0);
    expect(repository.getCredentials()[0].password).toBe("one");
  });

  it("uses the backup's version when chosen", () => {
    const phone = { folders: [banks], credentials: [makeCredential({})] };
    const backup = { folders: [banks], credentials: [makeCredential({ password: "two" })] };

    const { repository, result } = restore(phone, backup, [["c1", "backup"]]);

    expect(result.updated).toBe(1);
    expect(repository.getCredentials()).toHaveLength(1);
    expect(repository.getCredentials()[0].password).toBe("two");
  });

  it("counts an invalid backup item instead of stopping", () => {
    const backup = {
      folders: [banks],
      credentials: [
        makeCredential({ id: "bad", title: "" }),
        makeCredential({ id: "good", title: "Fine" }),
      ],
    };
    const { result } = restore({ folders: [], credentials: [] }, backup);
    expect(result).toEqual({ added: 1, updated: 0, failed: 1 });
  });
});
