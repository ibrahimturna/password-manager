import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
  type AutofillLogin,
  type AutofillTarget,
  cancelAutofill,
  finishAutofill,
  getAutofillRequest,
  setAutofillOfferTitles,
} from "../../../modules/password-autofill";

import { Icon } from "@/components/icon";
import { createSqliteVaultRepository } from "@/data/sqlite-vault-repository";
import type { VaultRepository } from "@/data/vault-repository";
import {
  openVaultDatabase,
  readAutofillLinks,
  readSavedLoginsFolderId,
  writeAutofillLink,
  writeSavedLoginsFolderId,
} from "@/data/vault-database";
import { UnlockScreen } from "@/features/lock/unlock-screen";
import {
  isDeviceLockOn,
  isVaultSetUp,
  unlockWithDeviceLock,
  unlockWithPassword,
} from "@/features/lock/vault-keys";
import { SettingsProvider } from "@/features/settings/settings-context";
import { en } from "@/i18n/en";
import { tr } from "@/i18n/tr";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";
import type { Credential } from "@/types/vault";

import {
  filterCredentials,
  findLinkedCredentials,
  findSavedLoginsFolder,
  getOfferTitles,
  planSave,
} from "./autofill-rules";
import { announceVaultChange } from "./vault-change-signal";

// The window that opens from another app's login screen, to fill or to save a login. It always
// asks the user to prove who they are, and never touches the main window's vault session.
// The window is see-through: only the phone lock prompt, or a sheet from the bottom, shows.
export function AutofillRoot() {
  return (
    <SettingsProvider>
      <SafeAreaProvider>
        <AutofillScreen />
      </SafeAreaProvider>
    </SettingsProvider>
  );
}

type Phase = "starting" | "locked" | "picking" | "updating";

function AutofillScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [request] = useState(getAutofillRequest);
  const target = request?.target ?? null;
  const login = request?.login ?? null;
  const [phase, setPhase] = useState<Phase>("starting");
  const [updating, setUpdating] = useState<Credential | null>(null);
  const repositoryRef = useRef<VaultRepository | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [linked, setLinked] = useState<Credential[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const dbRef = useRef<SQLiteDatabase | null>(null);

  function closeVault() {
    dbRef.current?.closeSync();
    dbRef.current = null;
  }

  useEffect(() => {
    async function start() {
      if (!(await isVaultSetUp())) {
        cancelAutofill();
        return;
      }
      // With the phone lock, nothing of this app shows behind the prompt.
      if (await isDeviceLockOn()) {
        await unlockDevice();
      } else {
        setPhase("locked");
      }
    }
    start().catch(cancelAutofill);
    // Leaving with the back button also closes the vault.
    return closeVault;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Runs once, for this one request.
  }, []);

  // Offer titles only change when links do, so the main window's update does not cover this.
  function remember(credentialId: string) {
    const db = dbRef.current;
    if (db === null || target === null) return;
    writeAutofillLink(db, target.key, credentialId);
    const all = repositoryRef.current?.getCredentials() ?? [];
    setAutofillOfferTitles(getOfferTitles(all, readAutofillLinks(db)));
  }

  function fill(credential: Credential, shouldRemember: boolean) {
    if (dbRef.current === null) return;
    if (shouldRemember) {
      remember(credential.id);
      announceVaultChange();
    }
    closeVault();
    finishAutofill(credential.username, credential.password);
  }

  function cancel() {
    closeVault();
    cancelAutofill();
  }

  function finishSaving() {
    closeVault();
    announceVaultChange();
    ToastAndroid.show(t.autofill.saved, ToastAndroid.SHORT);
    cancelAutofill();
  }

  // Also creates the folder the first time, and again if the user deleted it.
  function createSavedLogin(saving: AutofillTarget, typed: AutofillLogin) {
    const repository = repositoryRef.current;
    const db = dbRef.current;
    if (repository === null || db === null) return;
    const existing = findSavedLoginsFolder(repository.getFolders(), readSavedLoginsFolderId(db), [
      en.autofill.savedFolder,
      tr.autofill.savedFolder,
    ]);
    const created =
      existing === undefined ? repository.createFolder(t.autofill.savedFolder, null) : null;
    const folder = existing ?? (created?.ok === true ? created.folder : null);
    if (folder === null) {
      cancel();
      return;
    }
    writeSavedLoginsFolderId(db, folder.id);

    const result = repository.createCredential({
      folderId: folder.id,
      title: saving.label,
      username: typed.username ?? "",
      password: typed.password,
    });
    if (!result.ok) {
      cancel();
      return;
    }
    remember(result.credential.id);
    finishSaving();
  }

  function updateSavedLogin() {
    const repository = repositoryRef.current;
    if (repository === null || updating === null || login === null) return;
    const result = repository.updateCredential(updating.id, {
      folderId: updating.folderId,
      title: updating.title,
      username: updating.username ?? "",
      password: login.password,
    });
    if (!result.ok) {
      cancel();
      return;
    }
    finishSaving();
  }

  function save(saving: AutofillTarget, typed: AutofillLogin, db: SQLiteDatabase) {
    const all = repositoryRef.current?.getCredentials() ?? [];
    const plan = planSave(all, readAutofillLinks(db), saving, typed);
    if (plan.kind === "create") {
      createSavedLogin(saving, typed);
    } else if (plan.kind === "update") {
      setUpdating(plan.credential);
      setPhase("updating");
    } else {
      remember(plan.credential.id);
      finishSaving();
    }
  }

  async function openVault(vaultKey: string) {
    const db = await openVaultDatabase(vaultKey, true);
    dbRef.current = db;
    const repository = createSqliteVaultRepository(db, randomUUID, Date.now);
    repositoryRef.current = repository;

    if (login !== null && target !== null) {
      save(target, login, db);
      return;
    }

    const all = repository.getCredentials();
    const matches = findLinkedCredentials(all, readAutofillLinks(db), target);

    if (matches.length === 1) {
      fill(matches[0], false);
      return;
    }
    setCredentials(all);
    setLinked(matches);
    setPhase("picking");
  }

  async function unlockPassword(password: string): Promise<boolean> {
    try {
      const vaultKey = await unlockWithPassword(password);
      if (vaultKey === null) return false;
      await openVault(vaultKey);
      return true;
    } catch {
      cancel();
      return true;
    }
  }

  async function unlockDevice() {
    try {
      const vaultKey = await unlockWithDeviceLock(t.lock.devicePrompt);
      if (vaultKey === null) {
        cancel();
      } else {
        await openVault(vaultKey);
      }
    } catch {
      cancel();
    }
  }

  if (phase === "starting") {
    return null;
  }

  if (phase === "locked") {
    return (
      <SafeAreaView style={styles.screen}>
        <UnlockScreen
          isDeviceLockOn={false}
          onUnlockWithPassword={unlockPassword}
          onUnlockWithDeviceLock={unlockDevice}
        />
      </SafeAreaView>
    );
  }

  if (phase === "updating" && updating !== null) {
    return (
      <Sheet onCancel={cancel}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.autofill.updateTitle}</Text>
          <Text style={styles.text}>{t.autofill.updateNote(updating.title)}</Text>
        </View>
        <View style={styles.footer}>
          <Pressable onPress={cancel} accessibilityRole="button">
            <Text style={styles.link}>{t.autofill.cancel}</Text>
          </Pressable>
          <Pressable onPress={updateSavedLogin} accessibilityRole="button">
            <Text style={styles.link}>{t.autofill.update}</Text>
          </Pressable>
        </View>
      </Sheet>
    );
  }

  const isPickingLinked = linked.length > 0 && !showAll;
  const shown = filterCredentials(isPickingLinked ? linked : credentials, query);

  return (
    <Sheet onCancel={cancel}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {target === null ? t.autofill.title : t.autofill.titleFor(target.label)}
        </Text>
        {target === null && <Text style={styles.text}>{t.autofill.unknownTarget}</Text>}
        {!isPickingLinked && target !== null && (
          <Text style={styles.text}>{t.autofill.rememberNote}</Text>
        )}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t.home.searchPlaceholder}
          placeholderTextColor={colors.onSurfaceVariant}
          autoCorrect={false}
          style={styles.search}
        />
      </View>

      <FlatList
        data={shown}
        keyExtractor={(credential) => credential.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.text}>{t.autofill.noMatches}</Text>}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => fill(item, !isPickingLinked)}
            style={styles.row}
            accessibilityRole="button"
          >
            <Icon name="key" color={colors.onSurfaceVariant} size={20} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.text}>{item.username ?? t.tree.noUsername}</Text>
            </View>
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        {isPickingLinked && (
          <Pressable onPress={() => setShowAll(true)} accessibilityRole="button">
            <Text style={styles.link}>{t.autofill.showAll}</Text>
          </Pressable>
        )}
        <Pressable onPress={cancel} accessibilityRole="button">
          <Text style={styles.link}>{t.autofill.cancel}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

// A panel at the bottom, with the other app still visible above it. Tapping outside cancels.
function Sheet({ onCancel, children }: { onCancel: () => void; children: ReactNode }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.sheetArea}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessible={false} />
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        {children}
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    sheetArea: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      flexShrink: 1,
      maxHeight: "75%",
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: colors.surface,
    },
    header: {
      gap: 8,
      padding: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.onSurface,
    },
    text: {
      color: colors.onSurfaceVariant,
    },
    search: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: 8,
      fontSize: 16,
      color: colors.onSurface,
    },
    list: {
      paddingHorizontal: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.outlineVariant,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 18,
      color: colors.onSurface,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 24,
      padding: 16,
    },
    link: {
      fontSize: 16,
      color: colors.primary,
    },
  });
}
