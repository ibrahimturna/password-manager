import type { AutofillLogin, AutofillTarget } from "../../../modules/password-autofill";

import { normalizeForSearch } from "@/features/search/search";
import type { Credential, Folder } from "@/types/vault";

// One link between a password and the app or website it belongs to.
export type AutofillLink = {
  target: string;
  credentialId: string;
};

export function findLinkedCredentials(
  credentials: Credential[],
  links: AutofillLink[],
  target: AutofillTarget | null,
): Credential[] {
  if (target === null) return [];
  const linkedIds = new Set(
    links.filter((link) => link.target === target.key).map((link) => link.credentialId),
  );
  return credentials.filter((credential) => linkedIds.has(credential.id));
}

// The apps and websites one password is linked to, in a stable order for the list.
export function getLinkedTargets(links: AutofillLink[], credentialId: string): string[] {
  return links
    .filter((link) => link.credentialId === credentialId)
    .map((link) => link.target)
    .sort();
}

// The name to show for a stored link. An app that was uninstalled only has its package name.
export function getTargetLabel(key: string, apps: AutofillTarget[]): string {
  return apps.find((app) => app.key === key)?.label ?? key.replace(/^(app|web):/, "");
}

export function filterApps(
  apps: AutofillTarget[],
  linkedKeys: string[],
  query: string,
): AutofillTarget[] {
  const wanted = normalizeForSearch(query.trim());
  return apps.filter(
    (app) => !linkedKeys.includes(app.key) && normalizeForSearch(app.label).includes(wanted),
  );
}

export function filterCredentials(credentials: Credential[], query: string): Credential[] {
  const wanted = normalizeForSearch(query.trim());
  if (wanted === "") return credentials;
  return credentials.filter((credential) =>
    normalizeForSearch(`${credential.title} ${credential.username ?? ""}`).includes(wanted),
  );
}

// The title each login's offer shows before unlocking. A login with several passwords is left
// out, because one title would be wrong for the others.
export function getOfferTitles(
  credentials: Credential[],
  links: AutofillLink[],
): Record<string, string> {
  const titleById = new Map(credentials.map((credential) => [credential.id, credential.title]));
  const titlesByTarget = new Map<string, string[]>();
  for (const link of links) {
    const title = titleById.get(link.credentialId);
    if (title === undefined) continue;
    titlesByTarget.set(link.target, [...(titlesByTarget.get(link.target) ?? []), title]);
  }

  const offers: Record<string, string> = {};
  for (const [target, titles] of titlesByTarget) {
    if (titles.length === 1) offers[target] = titles[0];
  }
  return offers;
}

// The folder for saved logins. It is remembered by id, so renaming it or changing the app's
// language keeps using it. A folder made before ids were remembered is found by its name.
export function findSavedLoginsFolder(
  folders: Folder[],
  rememberedId: string | null,
  names: string[],
): Folder | undefined {
  return (
    folders.find((folder) => folder.id === rememberedId) ??
    folders.find((folder) => folder.parentId === null && names.includes(folder.name))
  );
}

// What saving a typed login should do.
export type SavePlan =
  | { kind: "already-saved"; credential: Credential }
  | { kind: "update"; credential: Credential }
  | { kind: "create" };

export function planSave(
  credentials: Credential[],
  links: AutofillLink[],
  target: AutofillTarget,
  login: AutofillLogin,
): SavePlan {
  const linked = findLinkedCredentials(credentials, links, target);
  const isSameUser = (credential: Credential) => credential.username === login.username;
  const isSameLogin = (credential: Credential) =>
    isSameUser(credential) && credential.password === login.password;

  // Only this login's own entries count: every app and website keeps a separate entry, even
  // with the same username and password as another one.
  const same = linked.find(isSameLogin);
  if (same !== undefined) return { kind: "already-saved", credential: same };

  const changed = linked.find(isSameUser);
  if (changed !== undefined) return { kind: "update", credential: changed };

  return { kind: "create" };
}
