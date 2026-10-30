import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, View } from "react-native";

import {
  applyRestorePlan,
  type RestoreChoice,
  type RestorePlan,
  type RestoreResult,
} from "@/features/backup/restore-plan";
import type { FolderDeletion } from "@/features/folders/folder-mutations";
import type { CredentialInput } from "@/features/credentials/credential-validation";
import { keptState } from "@/features/lock/kept-state";
import { shouldLock } from "@/features/lock/lock-rules";
import { SetupScreen } from "@/features/lock/setup-screen";
import { UnlockScreen } from "@/features/lock/unlock-screen";
import {
  canUseDeviceLock,
  deleteOldKey,
  getKeyForNewSetup,
  isDeviceLockOn,
  isVaultSetUp,
  savePasswordCopy,
  turnOffDeviceLock,
  turnOnDeviceLock,
  unlockWithDeviceLock,
  unlockWithPassword,
  verifyWithDeviceLock,
} from "@/features/lock/vault-keys";
import { useSettings } from "@/features/settings/settings-context";
import { useTranslation } from "@/i18n/use-translation";
import { useTheme } from "@/theme/use-theme";
import type { Credential, Folder } from "@/types/vault";

import { createSqliteVaultRepository } from "./sqlite-vault-repository";
import {
  deleteUnreadableDatabase,
  openVaultDatabase,
  readMasterPassword,
  writeMasterPassword,
} from "./vault-database";
import type {
  CreateFolderResult,
  CredentialDeletion,
  RenameFolderResult,
  SaveCredentialResult,
  VaultRepository,
} from "./vault-repository";

// What every screen inside <VaultProvider> can read and call.
type VaultContextValue = {
  folders: Folder[];
  credentials: Credential[];
  createFolder: (name: string, parentId: string | null) => CreateFolderResult;
  renameFolder: (id: string, name: string) => RenameFolderResult;
  deleteFolder: (id: string) => FolderDeletion;
  restoreDeletion: (deletion: FolderDeletion) => void;
  createCredential: (input: CredentialInput) => SaveCredentialResult;
  updateCredential: (id: string, input: CredentialInput) => SaveCredentialResult;
  deleteCredential: (id: string) => CredentialDeletion;
  restoreCredentials: (deletion: CredentialDeletion) => void;
  lock: () => void;
  masterPassword: string;
  changeMasterPassword: (password: string) => Promise<void>;
  deviceLockAvailable: boolean;
  deviceLockOn: boolean;
  setDeviceLockOn: (on: boolean) => Promise<void>;
  // Asks for the phone's lock while the vault is open. Resolves to whether it succeeded.
  verifyUser: (promptMessage: string) => Promise<boolean>;
  // Runs a system screen (like a file picker) without it counting as leaving the app.
  whileOutsideApp: <T>(task: () => Promise<T>) => Promise<T>;
  restoreBackup: (
    plan: RestorePlan,
    choices: ReadonlyMap<string, RestoreChoice>,
  ) => RestoreResult;
};

const VaultContext = createContext<VaultContextValue | null>(null);

// An open vault. It exists only while unlocked.
type Session = {
  db: SQLiteDatabase;
  repository: VaultRepository;
  vaultKey: string;
};

type Phase = "starting" | "setup" | "locked" | "unlocked" | "failed";

// Decides what the app shows: first-time setup, the lock screen, or the vault itself.
// The screens below only exist while the vault is unlocked, so locking removes them
// and everything they hold.
export function VaultProvider({ children }: { children: ReactNode }) {
  const t = useTranslation();
  const { colors } = useTheme();
  const { autoLock } = useSettings();
  const [phase, setPhase] = useState<Phase>("starting");
  const [session, setSession] = useState<Session | null>(null);
  const [deviceLockAvailable, setDeviceLockAvailable] = useState(false);
  const [deviceLockOn, setDeviceLockOnState] = useState(false);

  // Asking for the phone's PIN opens a system screen, which counts as leaving the app.
  // This stops that from locking the vault in the middle of the check.
  const isVerifyingRef = useRef(false);
  // The open session, for closing it exactly once when the vault locks.
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    async function start() {
      setDeviceLockAvailable(await canUseDeviceLock());
      setDeviceLockOnState(await isDeviceLockOn());
      setPhase((await isVaultSetUp()) ? "locked" : "setup");
    }
    start().catch(fail);
  }, []);

  // Never fall back to an unprotected vault; show an error instead.
  function fail(error: unknown) {
    console.error(error);
    setPhase("failed");
  }

  const openSession = useCallback(async (vaultKey: string) => {
    const db = await openVaultDatabase(vaultKey);
    const repository = createSqliteVaultRepository(db, randomUUID, Date.now);
    // Also finishes a setup that was interrupted before this step.
    await deleteOldKey();
    const opened = { db, repository, vaultKey };
    sessionRef.current = opened;
    keptState.finishUnlocking();
    setSession(opened);
    setPhase("unlocked");
    return db;
  }, []);

  async function setUp(password: string, useDeviceLock: boolean) {
    try {
      const { vaultKey, isNew } = await getKeyForNewSetup();
      if (isNew) await deleteUnreadableDatabase();
      await savePasswordCopy(vaultKey, password);
      const db = await openSession(vaultKey);
      writeMasterPassword(db, password);
      if (useDeviceLock) {
        await turnOnDeviceLock(vaultKey);
        setDeviceLockOnState(true);
      }
    } catch (error) {
      fail(error);
    }
  }

  async function unlockPassword(password: string): Promise<boolean> {
    try {
      const vaultKey = await unlockWithPassword(password);
      if (vaultKey === null) return false;
      const db = await openSession(vaultKey);
      if (readMasterPassword(db) === null) writeMasterPassword(db, password);
      return true;
    } catch (error) {
      fail(error);
      return true;
    }
  }

  const unlockDevice = useCallback(async () => {
    try {
      const vaultKey = await unlockWithDeviceLock(t.lock.devicePrompt);
      if (vaultKey !== null) await openSession(vaultKey);
    } catch (error) {
      fail(error);
    }
  }, [openSession, t.lock.devicePrompt]);

  const lock = useCallback(() => {
    // Must happen before the screens close, so they keep what the user was doing.
    keptState.startLocking();
    sessionRef.current?.db.closeSync();
    sessionRef.current = null;
    setSession(null);
    setPhase("locked");
  }, []);

  // Locks the vault after the app stayed in the background for the chosen time.
  const isUnlocked = session !== null;
  useEffect(() => {
    if (!isUnlocked) return;
    let backgroundedAt: number | null = null;

    const subscription = AppState.addEventListener("change", (state) => {
      if (isVerifyingRef.current) return;
      if (state === "background") {
        backgroundedAt = Date.now();
        if (autoLock === "immediately") lock();
      } else if (state === "active") {
        if (shouldLock(backgroundedAt, Date.now(), autoLock)) lock();
        backgroundedAt = null;
      }
    });
    return () => subscription.remove();
  }, [isUnlocked, autoLock, lock]);

  if (phase === "unlocked" && session !== null) {
    return (
      <LoadedVaultProvider
        session={session}
        lock={lock}
        deviceLockAvailable={deviceLockAvailable}
        deviceLockOn={deviceLockOn}
        onDeviceLockChange={setDeviceLockOnState}
        isVerifyingRef={isVerifyingRef}
      >
        {children}
      </LoadedVaultProvider>
    );
  }

  if (phase === "setup") {
    return <SetupScreen canUseDeviceLock={deviceLockAvailable} onSetUp={setUp} />;
  }

  if (phase === "locked") {
    return (
      <UnlockScreen
        isDeviceLockOn={deviceLockOn}
        onUnlockWithPassword={unlockPassword}
        onUnlockWithDeviceLock={unlockDevice}
      />
    );
  }

  return (
    <View style={[styles.startup, { backgroundColor: colors.surface }]}>
      {phase === "failed" ? (
        <Text style={{ color: colors.error }}>{t.vault.openFailed}</Text>
      ) : (
        <ActivityIndicator color={colors.primary} size="large" />
      )}
    </View>
  );
}

type LoadedVaultProviderProps = {
  session: Session;
  lock: () => void;
  deviceLockAvailable: boolean;
  deviceLockOn: boolean;
  onDeviceLockChange: (on: boolean) => void;
  isVerifyingRef: RefObject<boolean>;
  children: ReactNode;
};

// Owns the vault data for the whole app and shares it with every screen below it.
function LoadedVaultProvider({
  session,
  lock,
  deviceLockAvailable,
  deviceLockOn,
  onDeviceLockChange,
  isVerifyingRef,
  children,
}: LoadedVaultProviderProps) {
  const { db, repository, vaultKey } = session;

  // A copy of the repository's data in React state. Updating it makes the screens re-render.
  const [folders, setFolders] = useState(() => repository.getFolders());
  const [credentials, setCredentials] = useState(() => repository.getCredentials());
  const [masterPassword, setMasterPassword] = useState(() => readMasterPassword(db) ?? "");

  // Both functions return the repository's result, so the screen can show a validation error.
  // A rejected name changes nothing, but setFolders then gets the same array and React skips the re-render.
  function createFolder(name: string, parentId: string | null): CreateFolderResult {
    const result = repository.createFolder(name, parentId);
    setFolders(repository.getFolders());
    return result;
  }

  function renameFolder(id: string, name: string): RenameFolderResult {
    const result = repository.renameFolder(id, name);
    setFolders(repository.getFolders());
    return result;
  }

  // Deleting and restoring change credentials too, so both copies are refreshed.
  function deleteFolder(id: string): FolderDeletion {
    const deletion = repository.deleteFolder(id);
    setFolders(repository.getFolders());
    setCredentials(repository.getCredentials());
    return deletion;
  }

  function restoreDeletion(deletion: FolderDeletion) {
    repository.restoreDeletion(deletion);
    setFolders(repository.getFolders());
    setCredentials(repository.getCredentials());
  }

  // Credential changes only touch credentials, so only that copy is refreshed.
  function createCredential(input: CredentialInput): SaveCredentialResult {
    const result = repository.createCredential(input);
    setCredentials(repository.getCredentials());
    return result;
  }

  function updateCredential(id: string, input: CredentialInput): SaveCredentialResult {
    const result = repository.updateCredential(id, input);
    setCredentials(repository.getCredentials());
    return result;
  }

  function deleteCredential(id: string): CredentialDeletion {
    const deletion = repository.deleteCredential(id);
    setCredentials(repository.getCredentials());
    return deletion;
  }

  function restoreCredentials(deletion: CredentialDeletion) {
    repository.restoreCredentials(deletion);
    setCredentials(repository.getCredentials());
  }

  // Only re-locks the vault key's password copy; the database is not re-encrypted.
  async function changeMasterPassword(password: string) {
    await savePasswordCopy(vaultKey, password);
    writeMasterPassword(db, password);
    setMasterPassword(password);
  }

  async function setDeviceLockOn(on: boolean) {
    if (on) {
      await turnOnDeviceLock(vaultKey);
    } else {
      await turnOffDeviceLock();
    }
    onDeviceLockChange(on);
  }

  async function whileOutsideApp<T>(task: () => Promise<T>): Promise<T> {
    isVerifyingRef.current = true;
    try {
      return await task();
    } finally {
      isVerifyingRef.current = false;
    }
  }

  function verifyUser(promptMessage: string): Promise<boolean> {
    return whileOutsideApp(() => verifyWithDeviceLock(promptMessage));
  }

  function restoreBackup(plan: RestorePlan, choices: ReadonlyMap<string, RestoreChoice>) {
    const result = applyRestorePlan(repository, plan, choices);
    setFolders(repository.getFolders());
    setCredentials(repository.getCredentials());
    return result;
  }

  return (
    <VaultContext
      value={{
        folders,
        credentials,
        createFolder,
        renameFolder,
        deleteFolder,
        restoreDeletion,
        createCredential,
        updateCredential,
        deleteCredential,
        restoreCredentials,
        lock,
        masterPassword,
        changeMasterPassword,
        deviceLockAvailable,
        deviceLockOn,
        setDeviceLockOn,
        verifyUser,
        whileOutsideApp,
        restoreBackup,
      }}
    >
      {children}
    </VaultContext>
  );
}

// Gives a screen access to the vault. Only works inside <VaultProvider>.
export function useVault(): VaultContextValue {
  const vault = useContext(VaultContext);
  if (vault === null) {
    throw new Error("useVault must be used inside <VaultProvider>.");
  }
  return vault;
}

const styles = StyleSheet.create({
  startup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
