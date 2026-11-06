import type { Credential } from "@/types/vault";

import {
  getHost,
  getImportSource,
  parseCsv,
  planBrowserImport,
  readBrowserExport,
} from "./browser-import";

// Stands in for the native website check: http(s) addresses become their host.
const toKey = (url: string) => (url.startsWith("http") ? `web:${getHost(url)}` : null);

describe("parseCsv", () => {
  it("handles quotes, commas, quotes inside quotes and line breaks", () => {
    expect(parseCsv('a,"b,c","say ""hi""","two\nlines"\r\nd,e\n')).toEqual([
      ["a", "b,c", 'say "hi"', "two\nlines"],
      ["d", "e"],
    ]);
  });
});

describe("readBrowserExport", () => {
  it("reads a Chrome export", () => {
    const result = readBrowserExport(
      "﻿name,url,username,password,note\nGitHub,https://github.com/login,me,p@ss,\n",
    );
    expect(result).toEqual({
      browser: "chrome",
      logins: [{ title: "GitHub", url: "https://github.com/login", username: "me", password: "p@ss" }],
    });
  });

  it("reads a Firefox export and names logins after their site", () => {
    const result = readBrowserExport(
      '"url","username","password","httpRealm","formActionOrigin","guid","timeCreated","timeLastUsed","timePasswordChanged"\n' +
        '"https://www.reddit.com","me","secret",,"https://www.reddit.com","{1}","1","2","3"\n',
    );
    expect(result?.browser).toBe("firefox");
    expect(result?.logins[0]).toEqual({
      title: "reddit.com",
      url: "https://www.reddit.com",
      username: "me",
      password: "secret",
    });
  });

  it("uses the site when a Chrome login has no name", () => {
    const result = readBrowserExport("name,url,username,password\n,https://www.x.com/,a,b\n");
    expect(result?.logins[0].title).toBe("x.com");
  });

  it("refuses other files", () => {
    expect(readBrowserExport("title,login\nGmail,me\n")).toBeNull();
    expect(readBrowserExport("")).toBeNull();
  });
});

describe("getImportSource", () => {
  it("names Chromium browsers from the file name", () => {
    expect(getImportSource("chrome", "Brave Passwords.csv")).toBe("brave");
    expect(getImportSource("chrome", "Microsoft Edge Passwords.csv")).toBe("edge");
    expect(getImportSource("chrome", "Chrome Passwords.csv")).toBe("chrome");
  });

  it("falls back to Chrome for a renamed file", () => {
    expect(getImportSource("chrome", "passwords.csv")).toBe("chrome");
  });

  it("keeps Firefox whatever the file is called", () => {
    expect(getImportSource("firefox", "chrome-backup.csv")).toBe("firefox");
  });
});

describe("planBrowserImport", () => {
  const existing: Credential = {
    id: "c1",
    folderId: "f1",
    title: "GitHub",
    username: "me",
    password: "p@ss",
    createdAt: 0,
    updatedAt: 0,
  };
  const login = (title: string, url: string, username: string, password: string) => ({
    title,
    url,
    username,
    password,
  });

  it("skips a login already linked to the same website", () => {
    const plan = planBrowserImport(
      [login("GitHub", "https://github.com/login", "me", "p@ss")],
      [existing],
      [{ target: "web:github.com", credentialId: "c1" }],
      toKey,
    );
    expect(plan).toEqual({ items: [], alreadyHere: 1, unusable: 0 });
  });

  it("keeps the same login for another website", () => {
    const plan = planBrowserImport(
      [login("GitLab", "https://gitlab.com", "me", "p@ss")],
      [existing],
      [{ target: "web:github.com", credentialId: "c1" }],
      toKey,
    );
    expect(plan.items).toEqual([
      { input: { title: "GitLab", username: "me", password: "p@ss" }, target: "web:gitlab.com" },
    ]);
  });

  it("skips repeats inside the file and logins without a password", () => {
    const plan = planBrowserImport(
      [
        login("A", "https://a.com", "me", "1"),
        login("A", "https://a.com", "me", "1"),
        login("B", "https://b.com", "me", ""),
      ],
      [],
      [],
      toKey,
    );
    expect(plan.items).toHaveLength(1);
    expect(plan.alreadyHere).toBe(1);
    expect(plan.unusable).toBe(1);
  });

  it("matches logins without a website by title", () => {
    const plan = planBrowserImport([login("GitHub", "android://x", "me", "p@ss")], [existing], [], toKey);
    expect(plan.alreadyHere).toBe(1);
  });

  it("shortens long titles instead of leaving the login out", () => {
    const plan = planBrowserImport([login("x".repeat(150), "https://a.com", "", "1")], [], [], toKey);
    expect(plan.items[0].input.title).toHaveLength(100);
  });
});
