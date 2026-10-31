import type { AutofillLink } from "@/features/autofill/autofill-rules";
import type { Credential } from "@/types/vault";

import type { CredentialInput } from "./credential-validation";

// One entry per different value, so a choice only appears when there is something to choose.
export function getDistinctCredentials(
  credentials: Credential[],
  getValue: (credential: Credential) => string | null,
): Credential[] {
  const seen = new Set<string | null>();
  return credentials.filter((credential) => {
    const value = getValue(credential);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

// The entry whose title is kept also keeps its folder and survives the merge.
export function getMergedInput(
  kept: Credential,
  usernameFrom: Credential,
  passwordFrom: Credential,
): CredentialInput {
  return {
    folderId: kept.folderId,
    title: kept.title,
    username: usernameFrom.username ?? "",
    password: passwordFrom.password,
  };
}

// The apps and websites the kept entry takes over from the ones that go away.
export function getLinksToMove(
  links: AutofillLink[],
  keptId: string,
  mergedIds: string[],
): string[] {
  const kept = new Set(links.filter((link) => link.credentialId === keptId).map((l) => l.target));
  const moved = links
    .filter((link) => mergedIds.includes(link.credentialId) && !kept.has(link.target))
    .map((link) => link.target);
  return [...new Set(moved)];
}
