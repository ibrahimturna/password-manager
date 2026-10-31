import type { Credential } from "@/types/vault";

import {
  filterApps,
  filterCredentials,
  findLinkedCredentials,
  findSavedLoginsFolder,
  getLinkedTargets,
  getOfferTitles,
  getTargetLabel,
  planSave,
} from "./autofill-rules";

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

describe("link editor rules", () => {
  const notes = { key: "app:com.notes", label: "Notes" };
  const mail = { key: "app:com.mail", label: "Mail" };

  it("lists only this password's links", () => {
    const links = [
      { target: "web:b.com", credentialId: "c1" },
      { target: "web:a.com", credentialId: "c1" },
      { target: "web:c.com", credentialId: "c2" },
    ];
    expect(getLinkedTargets(links, "c1")).toEqual(["web:a.com", "web:b.com"]);
  });

  it("shows an app's name, a site, or the package of an uninstalled app", () => {
    expect(getTargetLabel("app:com.notes", [notes])).toBe("Notes");
    expect(getTargetLabel("web:a.com", [notes])).toBe("a.com");
    expect(getTargetLabel("app:com.gone", [notes])).toBe("com.gone");
  });

  it("hides linked apps and filters the rest by name", () => {
    expect(filterApps([notes, mail], ["app:com.notes"], "")).toEqual([mail]);
    expect(filterApps([notes, mail], [], "not")).toEqual([notes]);
  });
});

describe("getOfferTitles", () => {
  const credentials = [
    makeCredential({ title: "Facebook" }),
    makeCredential({ id: "c2", title: "Work" }),
  ];

  it("gives a login with one password its title", () => {
    const links = [{ target: "web:facebook.com", credentialId: "c1" }];
    expect(getOfferTitles(credentials, links)).toEqual({ "web:facebook.com": "Facebook" });
  });

  it("leaves out a login with several passwords", () => {
    const links = [
      { target: "web:facebook.com", credentialId: "c1" },
      { target: "web:facebook.com", credentialId: "c2" },
    ];
    expect(getOfferTitles(credentials, links)).toEqual({});
  });

  it("forgets the title of a deleted password", () => {
    const links = [{ target: "web:facebook.com", credentialId: "gone" }];
    expect(getOfferTitles(credentials, links)).toEqual({});
  });
});

describe("findSavedLoginsFolder", () => {
  const folders = [
    { id: "f1", name: "Renamed", parentId: null },
    { id: "f2", name: "Kaydedilen girişler", parentId: null },
    { id: "f3", name: "Saved logins", parentId: "f1" },
  ];
  const names = ["Saved logins", "Kaydedilen girişler"];

  it("keeps using the remembered folder after a rename", () => {
    expect(findSavedLoginsFolder(folders, "f1", names)?.id).toBe("f1");
  });

  it("finds a folder in either language when none is remembered", () => {
    expect(findSavedLoginsFolder(folders, null, names)?.id).toBe("f2");
  });

  it("falls back to the name after the remembered folder was deleted", () => {
    expect(findSavedLoginsFolder(folders, "gone", names)?.id).toBe("f2");
  });

  it("finds nothing when a new folder is needed", () => {
    expect(findSavedLoginsFolder([folders[0]], "gone", names)).toBeUndefined();
  });
});

describe("planSave", () => {
  const target = { key: "web:bank.com", label: "bank.com" };
  const links = [{ target: "web:bank.com", credentialId: "c1" }];
  const credentials = [makeCredential({}), makeCredential({ id: "c2", username: "other" })];

  it("does nothing new for a login that is already linked", () => {
    const plan = planSave(credentials, links, target, { username: "me", password: "one" });
    expect(plan).toMatchObject({ kind: "already-saved", credential: { id: "c1" } });
  });

  it("gives a new app or website its own entry, even with the same login", () => {
    const plan = planSave(credentials, [], target, { username: "other", password: "one" });
    expect(plan).toEqual({ kind: "create" });
  });

  it("offers to update a linked password that changed", () => {
    const plan = planSave(credentials, links, target, { username: "me", password: "two" });
    expect(plan).toMatchObject({ kind: "update", credential: { id: "c1" } });
  });

  it("creates a login for a new username", () => {
    const plan = planSave(credentials, links, target, { username: "new", password: "one" });
    expect(plan).toEqual({ kind: "create" });
  });

  it("never updates a password that is not linked to this login", () => {
    const plan = planSave(credentials, [], target, { username: "me", password: "two" });
    expect(plan).toEqual({ kind: "create" });
  });
});

describe("findLinkedCredentials", () => {
  const credentials = [makeCredential({}), makeCredential({ id: "c2" })];
  const target = { key: "web:bank.com", label: "bank.com" };

  it("returns only credentials linked to the target", () => {
    const links = [
      { target: "web:bank.com", credentialId: "c2" },
      { target: "web:other.com", credentialId: "c1" },
    ];
    expect(findLinkedCredentials(credentials, links, target).map((item) => item.id)).toEqual([
      "c2",
    ]);
  });

  it("ignores a link to a deleted credential", () => {
    const links = [{ target: "web:bank.com", credentialId: "gone" }];
    expect(findLinkedCredentials(credentials, links, target)).toEqual([]);
  });

  it("finds nothing for an unknown target", () => {
    const links = [{ target: "web:bank.com", credentialId: "c1" }];
    expect(findLinkedCredentials(credentials, links, null)).toEqual([]);
  });
});

describe("filterCredentials", () => {
  const credentials = [
    makeCredential({ title: "İş Bankası" }),
    makeCredential({ id: "c2", title: "Mail", username: null }),
  ];

  it("returns everything for an empty search", () => {
    expect(filterCredentials(credentials, "  ")).toHaveLength(2);
  });

  it("ignores Turkish letters and never needs a username", () => {
    expect(filterCredentials(credentials, "bankasi").map((item) => item.id)).toEqual(["c1"]);
    expect(filterCredentials(credentials, "mail").map((item) => item.id)).toEqual(["c2"]);
  });
});
