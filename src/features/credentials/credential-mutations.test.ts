import type { Credential } from "@/types/vault";

import {
  addCredential,
  deleteCredential,
  restoreCredentials,
  updateCredential,
} from "./credential-mutations";
import type { ValidCredential } from "./credential-validation";

const CREATED_AT = 1000;

function makeCredential(id: string, folderId: string): Credential {
  return {
    id,
    folderId,
    title: id,
    username: null,
    password: "fake-password",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

const testCredentials: Credential[] = [
  makeCredential("bank", "banks"),
  makeCredential("instagram", "social"),
  makeCredential("reddit", "social"),
];

const newValues: ValidCredential = {
  folderId: "social",
  title: "Mastodon",
  username: "demo",
  password: "fake-password-2",
};

describe("addCredential", () => {
  it("adds the credential at the end with both timestamps set to now", () => {
    const result = addCredential(testCredentials, "mastodon", newValues, 5000);

    expect(result).toHaveLength(4);
    expect(result[3]).toEqual({ id: "mastodon", ...newValues, createdAt: 5000, updatedAt: 5000 });
  });

  it("does not change the original array", () => {
    addCredential(testCredentials, "mastodon", newValues, 5000);

    expect(testCredentials).toHaveLength(3);
  });
});

describe("updateCredential", () => {
  it("replaces the values, keeps createdAt and sets updatedAt to now", () => {
    const result = updateCredential(testCredentials, "instagram", newValues, 9000);

    expect(result[1]).toEqual({
      id: "instagram",
      ...newValues,
      createdAt: CREATED_AT,
      updatedAt: 9000,
    });
  });

  it("leaves the other credentials untouched", () => {
    const result = updateCredential(testCredentials, "instagram", newValues, 9000);

    expect(result[0]).toBe(testCredentials[0]);
    expect(result[2]).toBe(testCredentials[2]);
  });
});

describe("deleteCredential and restoreCredentials", () => {
  it("removes only the given credential", () => {
    const { credentials } = deleteCredential(testCredentials, "instagram");

    expect(credentials.map((credential) => credential.id)).toEqual(["bank", "reddit"]);
  });

  it("restores the credential to its original position", () => {
    const { credentials, removed } = deleteCredential(testCredentials, "instagram");

    expect(restoreCredentials(credentials, removed)).toEqual(testCredentials);
  });

  it("removes nothing for a missing id", () => {
    const { credentials, removed } = deleteCredential(testCredentials, "missing");

    expect(credentials).toEqual(testCredentials);
    expect(removed).toEqual([]);
  });
});
