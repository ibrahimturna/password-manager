import type { VaultContents, VaultRepository } from "@/data/vault-repository";
import { isSameFolderName } from "@/features/folders/folder-name";
import { expandWithParents, getChildFolders } from "@/features/folders/folder-tree";
import type { Credential, Folder } from "@/types/vault";

// The same password exists on the phone and in the backup, with different details.
export type RestoreConflict = {
  phone: Credential;
  backup: Credential;
};

export type RestoreChoice = "phone" | "backup";

// What restoring a backup would do. Restoring only adds or, when the user chooses so,
// updates: nothing is ever deleted.
export type RestorePlan = {
  // Parents come before their children.
  newFolders: Folder[];
  newCredentials: Credential[];
  conflicts: RestoreConflict[];
  // Identical on both sides, so nothing to do.
  sameCount: number;
  // Backup folder id -> id of the folder with the same place and name on the phone.
  matchingFolders: ReadonlyMap<string, string>;
};

export type RestoreResult = {
  added: number;
  updated: number;
  failed: number;
};

// Compares a backup with the phone. Folders are the same when they have the same name in the
// same place, because a backup from another phone has different ids. Credentials are the
// same when they have the same id, or the same title and username in the same folder.
export function createRestorePlan(phone: VaultContents, backup: VaultContents): RestorePlan {
  const newFolders: Folder[] = [];
  const matchingFolders = new Map<string, string>();

  // `phoneParentId` is undefined once the path has left what exists on the phone.
  function visit(backupParentId: string | null, phoneParentId: string | null | undefined) {
    for (const folder of getChildFolders(backup.folders, backupParentId)) {
      const match =
        phoneParentId === undefined
          ? undefined
          : getChildFolders(phone.folders, phoneParentId).find((candidate) =>
              isSameFolderName(candidate.name, folder.name),
            );
      if (match === undefined) {
        newFolders.push(folder);
      } else {
        matchingFolders.set(folder.id, match.id);
      }
      visit(folder.id, match?.id);
    }
  }
  visit(null, null);

  const newCredentials: Credential[] = [];
  const conflicts: RestoreConflict[] = [];
  let sameCount = 0;
  // Each phone credential is compared once, even if the backup has two look-alikes.
  const usedPhoneIds = new Set<string>();

  for (const credential of backup.credentials) {
    const folderId = matchingFolders.get(credential.folderId);
    const available = phone.credentials.filter((item) => !usedPhoneIds.has(item.id));
    const match =
      available.find((item) => item.id === credential.id) ??
      available.find(
        (item) =>
          item.folderId === folderId &&
          item.title === credential.title &&
          item.username === credential.username,
      );

    if (match === undefined) {
      newCredentials.push(credential);
      continue;
    }
    usedPhoneIds.add(match.id);
    const isSame =
      match.folderId === folderId &&
      match.title === credential.title &&
      match.username === credential.username &&
      match.password === credential.password;
    if (isSame) {
      sameCount += 1;
    } else {
      conflicts.push({ phone: match, backup: credential });
    }
  }

  return { newFolders, newCredentials, conflicts, sameCount, matchingFolders };
}

export type RestoreStatus = "new" | "same" | "conflict";

// What the review screen needs to show a backup as a tree.
export type RestoreTree = {
  newFolderIds: ReadonlySet<string>;
  // Keyed by the backup credential's id. Credentials missing here are "same".
  credentialStatuses: ReadonlyMap<string, RestoreStatus>;
  // Backup folders to open at the start, so that everything that would change is visible.
  openFolderIds: ReadonlySet<string>;
};

export function getRestoreTree(plan: RestorePlan, backupFolders: Folder[]): RestoreTree {
  const credentialStatuses = new Map<string, RestoreStatus>();
  let openFolderIds: ReadonlySet<string> = new Set<string>();

  for (const credential of plan.newCredentials) {
    credentialStatuses.set(credential.id, "new");
    openFolderIds = expandWithParents(openFolderIds, credential.folderId, backupFolders);
  }
  for (const { backup } of plan.conflicts) {
    credentialStatuses.set(backup.id, "conflict");
    openFolderIds = expandWithParents(openFolderIds, backup.folderId, backupFolders);
  }
  for (const folder of plan.newFolders) {
    if (folder.parentId !== null) {
      openFolderIds = expandWithParents(openFolderIds, folder.parentId, backupFolders);
    }
  }

  return {
    newFolderIds: new Set(plan.newFolders.map((folder) => folder.id)),
    credentialStatuses,
    openFolderIds,
  };
}

// Carries out a plan. A conflict without a choice keeps the phone's version.
// `choices` is keyed by the backup credential's id.
export function applyRestorePlan(
  repository: VaultRepository,
  plan: RestorePlan,
  choices: ReadonlyMap<string, RestoreChoice>,
): RestoreResult {
  const folderIds = new Map(plan.matchingFolders);
  let added = 0;
  let updated = 0;
  let failed = 0;

  for (const folder of plan.newFolders) {
    const parentId = folder.parentId === null ? null : folderIds.get(folder.parentId);
    if (parentId === undefined) {
      failed += 1;
      continue;
    }
    const result = repository.createFolder(folder.name, parentId);
    if (result.ok) {
      folderIds.set(folder.id, result.folder.id);
    } else {
      failed += 1;
    }
  }

  function toInput(credential: Credential) {
    const folderId = folderIds.get(credential.folderId);
    if (folderId === undefined) return null;
    const { title, password } = credential;
    return { folderId, title, username: credential.username ?? "", password };
  }

  for (const credential of plan.newCredentials) {
    const input = toInput(credential);
    if (input !== null && repository.createCredential(input).ok) {
      added += 1;
    } else {
      failed += 1;
    }
  }

  for (const { phone, backup } of plan.conflicts) {
    if (choices.get(backup.id) !== "backup") continue;
    const input = toInput(backup);
    if (input !== null && repository.updateCredential(phone.id, input).ok) {
      updated += 1;
    } else {
      failed += 1;
    }
  }

  return { added, updated, failed };
}
