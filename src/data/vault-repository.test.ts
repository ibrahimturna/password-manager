import type { Folder } from "@/types/vault";

import { createInMemoryVaultRepository } from "./vault-repository";

const seedFolders: Folder[] = [
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

// A fake clock: 1000, 2000, 3000, ... one step forward on every call.
function makeClock() {
  let time = 0;
  return () => {
    time += 1000;
    return time;
  };
}

function makeRepository() {
  return createInMemoryVaultRepository(
    { folders: seedFolders, credentials: [] },
    makeIdGenerator(),
    makeClock(),
  );
}

describe("createInMemoryVaultRepository", () => {
  it("starts with the seed data", () => {
    const repository = makeRepository();

    expect(repository.getFolders()).toEqual(seedFolders);
    expect(repository.getCredentials()).toEqual([]);
  });

  describe("createFolder", () => {
    it("creates a folder with a generated id and returns it", () => {
      const repository = makeRepository();

      const result = repository.createFolder("Investments", "banks");

      const expected = { id: "new-1", name: "Investments", parentId: "banks" };
      expect(result).toEqual({ ok: true, folder: expected });
      expect(repository.getFolders()).toContainEqual(expected);
    });

    it("stores the trimmed name", () => {
      const repository = makeRepository();

      repository.createFolder("  E-mail  ", null);

      expect(repository.getFolders()).toContainEqual({
        id: "new-1",
        name: "E-mail",
        parentId: null,
      });
    });

    it("gives each new folder a different id", () => {
      const repository = makeRepository();

      const first = repository.createFolder("E-mail", null);
      const second = repository.createFolder("E-mail", "banks");

      expect(first.ok && second.ok && first.folder.id !== second.folder.id).toBe(true);
    });

    it("rejects an invalid name and stores nothing", () => {
      const repository = makeRepository();
      const before = repository.getFolders();

      const result = repository.createFolder("banks", null);

      expect(result).toEqual({ ok: false, error: "duplicate" });
      expect(repository.getFolders()).toBe(before);
    });

    it("throws when the parent does not exist", () => {
      const repository = makeRepository();

      expect(() => repository.createFolder("Anything", "missing")).toThrow();
    });
  });

  describe("renameFolder", () => {
    it("renames and returns a new folders array", () => {
      const repository = makeRepository();
      const before = repository.getFolders();

      const result = repository.renameFolder("banks", "  Bank Accounts ");
      const after = repository.getFolders();

      expect(result).toEqual({ ok: true });
      // A new array is what lets React notice the change.
      expect(after).not.toBe(before);
      expect(after[0].name).toBe("Bank Accounts");
    });

    it("rejects an invalid name and changes nothing", () => {
      const repository = makeRepository();
      const before = repository.getFolders();

      const result = repository.renameFolder("banks", "   ");

      expect(result).toEqual({ ok: false, error: "empty" });
      expect(repository.getFolders()).toBe(before);
    });

    it("throws when the folder does not exist", () => {
      const repository = makeRepository();

      expect(() => repository.renameFolder("missing", "Anything")).toThrow();
    });
  });

  it("does not change the seed data", () => {
    const repository = makeRepository();

    repository.renameFolder("banks", "Bank Accounts");
    repository.createFolder("E-mail", null);

    expect(seedFolders).toEqual([
      { id: "banks", name: "Banks", parentId: null },
      { id: "social", name: "Social", parentId: null },
    ]);
  });
});

describe("deleteFolder and restoreDeletion", () => {
  it("deletes a folder with its subfolders, then undo brings them back", () => {
    const repository = makeRepository();
    const created = repository.createFolder("Investments", "banks");
    const before = repository.getFolders();

    const deletion = repository.deleteFolder("banks");

    expect(repository.getFolders().map((folder) => folder.id)).toEqual(["social"]);
    expect(created.ok && deletion.folders.length).toBe(2);

    repository.restoreDeletion(deletion);

    expect(repository.getFolders()).toEqual(before);
  });

  it("throws when the folder does not exist", () => {
    const repository = makeRepository();

    expect(() => repository.deleteFolder("missing")).toThrow();
  });
});

describe("credentials", () => {
  const input = { folderId: "banks", title: " Bank ", username: "", password: "fake-password" };

  it("creates a credential with a generated id, cleaned values and timestamps", () => {
    const repository = makeRepository();

    const result = repository.createCredential(input);

    const expected = {
      id: "new-1",
      folderId: "banks",
      title: "Bank",
      username: null,
      password: "fake-password",
      createdAt: 1000,
      updatedAt: 1000,
    };
    expect(result).toEqual({ ok: true, credential: expected });
    expect(repository.getCredentials()).toEqual([expected]);
  });

  it("rejects invalid values and stores nothing", () => {
    const repository = makeRepository();

    const result = repository.createCredential({ ...input, title: "", password: "" });

    expect(result).toEqual({ ok: false, errors: { title: "empty", password: "empty" } });
    expect(repository.getCredentials()).toEqual([]);
  });

  it("updates a credential: keeps createdAt, moves updatedAt, can change folder", () => {
    const repository = makeRepository();
    repository.createCredential(input);

    const result = repository.updateCredential("new-1", {
      ...input,
      folderId: "social",
      title: "Renamed",
    });

    expect(result.ok && result.credential).toMatchObject({
      folderId: "social",
      title: "Renamed",
      createdAt: 1000,
      updatedAt: 2000,
    });
  });

  it("deletes a credential and undo puts it back", () => {
    const repository = makeRepository();
    repository.createCredential(input);
    const before = repository.getCredentials();

    const deletion = repository.deleteCredential("new-1");
    expect(repository.getCredentials()).toEqual([]);

    repository.restoreCredentials(deletion);
    expect(repository.getCredentials()).toEqual(before);
  });

  it("throws for a missing folder or credential", () => {
    const repository = makeRepository();

    expect(() => repository.createCredential({ ...input, folderId: "missing" })).toThrow();
    expect(() => repository.updateCredential("missing", input)).toThrow();
    expect(() => repository.deleteCredential("missing")).toThrow();
  });
});
