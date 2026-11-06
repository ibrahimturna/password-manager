import type { AutofillLink } from "@/features/autofill/autofill-rules";
import {
  type CredentialInput,
  MAX_TITLE_LENGTH,
  validateCredential,
} from "@/features/credentials/credential-validation";
import type { Credential } from "@/types/vault";

export type Browser = "chrome" | "firefox";

// Chrome, Edge, Brave, Opera and Vivaldi all export the same CSV, so the file name tells them
// apart. Each one names its file after itself unless the user renamed it.
export const IMPORT_SOURCES = ["chrome", "edge", "brave", "opera", "vivaldi", "firefox"] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

export function getImportSource(format: Browser, fileName: string): ImportSource {
  if (format === "firefox") return "firefox";
  const name = fileName.toLowerCase();
  return IMPORT_SOURCES.find((source) => source !== "firefox" && name.includes(source)) ?? "chrome";
}

export type BrowserLogin = { title: string; url: string; username: string; password: string };

// One password to create, and the website it fills, when the address is one.
export type ImportItem = { input: Omit<CredentialInput, "folderId">; target: string | null };

export type ImportPlan = { items: ImportItem[]; alreadyHere: number; unusable: number };

// Splits CSV text into rows of fields. Quoted fields can hold commas, line breaks and "" for a quote.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let isQuoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (isQuoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        isQuoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      isQuoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Chrome: name,url,username,password,note. Firefox: url,username,password,httpRealm,...
// Null when the file is neither.
export function readBrowserExport(
  text: string,
): { browser: Browser; logins: BrowserLogin[] } | null {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  if (header === undefined) return null;
  const columns = header.map((name) => name.trim().toLowerCase());
  const column = (name: string) => columns.indexOf(name);
  const url = column("url");
  const username = column("username");
  const password = column("password");
  if (url < 0 || username < 0 || password < 0) return null;

  const name = column("name");
  const browser: Browser | null =
    name >= 0 ? "chrome" : columns.includes("httprealm") ? "firefox" : null;
  if (browser === null) return null;

  const logins = rows
    .filter((row) => row.some((field) => field !== ""))
    .map((row) => ({
      title: (name >= 0 ? row[name] : undefined)?.trim() || getHost(row[url] ?? ""),
      url: row[url] ?? "",
      username: row[username] ?? "",
      password: row[password] ?? "",
    }));
  return { browser, logins };
}

// "https://www.github.com/login" → "github.com". The address itself when it has no host.
export function getHost(url: string): string {
  const host = /^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec(url.trim())?.[1];
  return (host ?? url.trim()).replace(/^www\./i, "");
}

// Decides what to create. A login counts as already here when a password with the same
// username and password is linked to the same website, or has the same title without a
// website. Logins the app cannot store (no password, values too long) are left out.
export function planBrowserImport(
  logins: BrowserLogin[],
  credentials: Credential[],
  links: AutofillLink[],
  getTargetKey: (url: string) => string | null,
): ImportPlan {
  const seen = new Set<string>();
  for (const credential of credentials) {
    const user = credential.username ?? "";
    for (const link of links) {
      if (link.credentialId === credential.id) seen.add(`${link.target}\n${user}\n${credential.password}`);
    }
    seen.add(`title:${credential.title}\n${user}\n${credential.password}`);
  }

  const plan: ImportPlan = { items: [], alreadyHere: 0, unusable: 0 };
  for (const login of logins) {
    // Titles are only shortened, never refused; the website link still tells logins apart.
    const title = [...(login.title.trim() || "Login")].slice(0, MAX_TITLE_LENGTH).join("");
    const input = { title, username: login.username, password: login.password };
    if (!validateCredential({ ...input, folderId: "" }).ok) {
      plan.unusable++;
      continue;
    }

    const target = getTargetKey(login.url);
    const key = `${target ?? `title:${title}`}\n${login.username.trim()}\n${login.password}`;
    if (seen.has(key)) {
      plan.alreadyHere++;
      continue;
    }
    seen.add(key);
    plan.items.push({ input, target });
  }
  return plan;
}
