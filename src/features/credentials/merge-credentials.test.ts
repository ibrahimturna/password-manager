import type { Credential } from "@/types/vault";

import {
  getDistinctCredentials,
  getLinksToMove,
  getMergedInput,
} from "./merge-credentials";

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

describe("getDistinctCredentials", () => {
  it("keeps the first entry for each value", () => {
    const first = makeCredential({ id: "a" });
    const same = makeCredential({ id: "b" });
    const other = makeCredential({ id: "c", username: null });
    expect(getDistinctCredentials([first, same, other], (c) => c.username)).toEqual([first, other]);
  });
});

describe("getMergedInput", () => {
  it("takes each value from the chosen entry, and the folder from the kept one", () => {
    const kept = makeCredential({ id: "a", title: "Keep", folderId: "f2", username: null });
    const usernameFrom = makeCredential({ id: "b", username: "name" });
    const passwordFrom = makeCredential({ id: "c", password: "two" });
    expect(getMergedInput(kept, usernameFrom, passwordFrom)).toEqual({
      folderId: "f2",
      title: "Keep",
      username: "name",
      password: "two",
    });
  });
});

describe("getLinksToMove", () => {
  it("moves each new target once, and skips the ones the kept entry has", () => {
    const links = [
      { target: "web:a.com", credentialId: "keep" },
      { target: "web:a.com", credentialId: "x" },
      { target: "web:b.com", credentialId: "x" },
      { target: "web:b.com", credentialId: "y" },
      { target: "web:c.com", credentialId: "other" },
    ];
    expect(getLinksToMove(links, "keep", ["x", "y"])).toEqual(["web:b.com"]);
  });
});
