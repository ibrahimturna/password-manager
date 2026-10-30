import type { File } from "expo-file-system";
import { type ComponentRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PasswordInput } from "@/components/password-input";
import { Snackbar } from "@/components/snackbar";
import { useVault } from "@/data/vault-context";
import {
  isBackupFile,
  openBackup,
  pickBackupFile,
  pickBackupFolder,
  saveBackup,
  shareBackup,
} from "@/features/backup/backup-storage";
import {
  createRestorePlan,
  type RestoreChoice,
  type RestorePlan,
} from "@/features/backup/restore-plan";
import { RestoreReview } from "@/features/backup/restore-review";
import { useKeptRoute } from "@/features/lock/use-kept-state";
import type { VaultContents } from "@/data/vault-repository";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

// Longer than a usual message: the user may want to read where the backup went.
const NOTICE_MS = 5000;

type Review = { plan: RestorePlan; backup: VaultContents };

// Saves or shares an encrypted copy of the vault, and adds a backup's contents to the vault.
// A backup holds everything, so making one asks for the phone's lock when it is on,
// otherwise for the master password.
export default function BackupScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const {
    folders,
    credentials,
    masterPassword,
    deviceLockOn,
    verifyUser,
    whileOutsideApp,
    restoreBackup,
  } = useVault();
  useKeptRoute("/backup");

  const [current, setCurrent] = useState("");
  const [isCurrentWrong, setIsCurrentWrong] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Restoring: the chosen file, then what restoring it would do.
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [backupPassword, setBackupPassword] = useState("");
  const [isBackupPasswordWrong, setIsBackupPasswordWrong] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // The backup password box is at the bottom of the screen. Room is added below it for the
  // keyboard, so the list can scroll the box above the keyboard.
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hidden = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(null), NOTICE_MS);
  }

  async function verify(): Promise<boolean> {
    if (deviceLockOn) return verifyUser(t.masterPasswordForm.verifyPrompt);
    const isRight = current === masterPassword;
    setIsCurrentWrong(!isRight);
    return isRight;
  }

  // Shows a spinner during a slow step, and a message if it fails.
  async function runBusy(task: () => Promise<void>) {
    setIsBusy(true);
    try {
      await task();
    } catch (error) {
      // A native error can quote the decrypted vault, so it must never reach a release log.
      if (__DEV__) console.error(error);
      showNotice(t.backup.failed);
    } finally {
      setIsBusy(false);
    }
  }

  async function saveToFolder() {
    if (!(await verify())) return;
    const folder = await whileOutsideApp(pickBackupFolder);
    if (folder === null) return;
    await runBusy(async () => {
      await saveBackup(folder, { folders, credentials }, masterPassword);
      showNotice(t.backup.saved);
    });
  }

  // The share screen may stay open for long, so the normal auto-lock keeps working here.
  async function share() {
    if (!(await verify())) return;
    await runBusy(() => shareBackup({ folders, credentials }, masterPassword));
  }

  async function chooseFile() {
    const file = await whileOutsideApp(pickBackupFile);
    if (file === null) return;
    await runBusy(async () => {
      if (await isBackupFile(file)) {
        setBackupPassword("");
        setIsBackupPasswordWrong(false);
        setPickedFile(file);
      } else {
        showNotice(t.backup.notABackup);
      }
    });
  }

  async function openPickedFile() {
    if (pickedFile === null || backupPassword === "") return;
    await runBusy(async () => {
      const result = await openBackup(pickedFile, backupPassword);
      if (result.ok) {
        const plan = createRestorePlan({ folders, credentials }, result.contents);
        setReview({ plan, backup: result.contents });
        setPickedFile(null);
      } else if (result.error === "wrong-password") {
        setIsBackupPasswordWrong(true);
      } else {
        setPickedFile(null);
        showNotice(t.backup.notABackup);
      }
    });
  }

  function restore(plan: RestorePlan, choices: ReadonlyMap<string, RestoreChoice>) {
    const { added, updated, failed } = restoreBackup(plan, choices);
    setReview(null);
    showNotice(t.backup.restored(added, updated, failed));
  }

  if (review !== null) {
    return (
      <RestoreReview
        plan={review.plan}
        phoneFolders={folders}
        backup={review.backup}
        onCancel={() => setReview(null)}
        onRestore={(choices) => restore(review.plan, choices)}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: 16 + keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (pickedFile !== null && keyboardHeight > 0) scrollRef.current?.scrollToEnd();
        }}
      >
        <Text style={styles.title}>{t.backup.backUpTitle}</Text>
        <Text style={styles.text}>{t.backup.backUpNote}</Text>

        {!deviceLockOn && (
          <>
            <Text style={styles.text}>{t.masterPasswordForm.current}</Text>
            <PasswordInput
              value={current}
              onChangeText={(text) => {
                setCurrent(text);
                setIsCurrentWrong(false);
              }}
              label={t.masterPasswordForm.current}
              showLabel={t.lock.showPassword}
              hideLabel={t.lock.hidePassword}
            />
            {isCurrentWrong && (
              <Text style={styles.error}>{t.masterPasswordForm.wrongCurrent}</Text>
            )}
          </>
        )}

        <Pressable
          onPress={saveToFolder}
          disabled={isBusy}
          style={styles.mainButton}
          accessibilityRole="button"
        >
          <Text style={styles.mainButtonText}>{t.backup.saveToFolder}</Text>
        </Pressable>
        <Pressable
          onPress={share}
          disabled={isBusy}
          style={styles.mainButton}
          accessibilityRole="button"
        >
          <Text style={styles.mainButtonText}>{t.backup.share}</Text>
        </Pressable>

        <Text style={styles.title}>{t.backup.restoreTitle}</Text>
        <Text style={styles.text}>{t.backup.restoreNote}</Text>

        {pickedFile === null ? (
          <Pressable
            onPress={chooseFile}
            disabled={isBusy}
            style={styles.mainButton}
            accessibilityRole="button"
          >
            <Text style={styles.mainButtonText}>{t.backup.chooseFile}</Text>
          </Pressable>
        ) : (
          <>
            <Text style={styles.text}>{t.backup.backupPassword}</Text>
            <PasswordInput
              value={backupPassword}
              onChangeText={(text) => {
                setBackupPassword(text);
                setIsBackupPasswordWrong(false);
              }}
              label={t.backup.backupPassword}
              showLabel={t.lock.showPassword}
              hideLabel={t.lock.hidePassword}
              onSubmitEditing={openPickedFile}
            />
            {isBackupPasswordWrong && (
              <Text style={styles.error}>{t.backup.wrongBackupPassword}</Text>
            )}
            <View style={styles.buttons}>
              <Pressable
                onPress={() => setPickedFile(null)}
                style={styles.button}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>{t.backup.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={openPickedFile}
                disabled={isBusy}
                style={styles.mainButton}
                accessibilityRole="button"
              >
                <Text style={styles.mainButtonText}>{t.backup.open}</Text>
              </Pressable>
            </View>
          </>
        )}

        {isBusy && <ActivityIndicator color={colors.primary} />}
      </ScrollView>

      {notice !== null && <Snackbar message={notice} bottom={insets.bottom + 16} />}
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      padding: 16,
      gap: 12,
    },
    title: {
      marginTop: 8,
      fontSize: 18,
      fontWeight: "600",
      color: colors.onSurface,
    },
    text: {
      color: colors.onSurfaceVariant,
    },
    error: {
      color: colors.error,
    },
    mainButton: {
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
      backgroundColor: colors.primary,
    },
    mainButtonText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    cancelText: {
      fontSize: 16,
      color: colors.primary,
    },
  });
}
