import { File, Paths } from "expo-file-system";
import { getContentUriAsync } from "expo-file-system/legacy";
import { startActivityAsync } from "expo-intent-launcher";
import * as Updates from "expo-updates";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

import { type ApkRelease, getLatestApk, needsApk } from "./apk-release";

// Updates only exist in installed builds. A development build loads its code from the
// development server instead, and the update functions reject there.
export const canUpdate = Updates.isEnabled && !__DEV__;

// A new APK comes first: an over-the-air update made for newer native code cannot load
// on this build anyway.
export type AvailableUpdate = { kind: "apk"; release: ApkRelease } | { kind: "ota" };

export async function findUpdate(): Promise<AvailableUpdate | null> {
  // GitHub being unreachable must not hide an over-the-air update.
  const apk = await getLatestApk().catch(() => null);
  if (apk !== null && needsApk(apk, Updates.runtimeVersion)) return { kind: "apk", release: apk };
  return (await Updates.checkForUpdateAsync()).isAvailable ? { kind: "ota" } : null;
}

// Locking removes every screen, which would ask again after each unlock. Once per start is enough.
let hasCheckedOnStart = false;

// Asks once per app start when a newer version is published.
export function UpdatePrompt() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);

  useEffect(() => {
    if (!canUpdate || hasCheckedOnStart) return;
    hasCheckedOnStart = true;
    // Offline or the server is down: the user can still check from Settings.
    findUpdate().then(setUpdate, () => undefined);
  }, []);

  return update === null ? null : <UpdateDialog update={update} onClose={() => setUpdate(null)} />;
}

const MB = 1024 * 1024;

// Over the air: downloads, then restarts the app with it. APK: downloads it, then opens
// Android's install screen, which replaces the app. Both lock the vault.
export function UpdateDialog({ update, onClose }: { update: AvailableUpdate; onClose: () => void }) {
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);
  const [phase, setPhase] = useState<"ask" | "downloading" | "failed">("ask");
  const [apkProgress, setApkProgress] = useState(0);
  const { downloadProgress } = Updates.useUpdates();
  const taskRef = useRef<ReturnType<typeof File.createDownloadTask> | null>(null);
  const progress = update.kind === "apk" ? apkProgress : (downloadProgress ?? 0);

  async function installOverTheAir() {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  }

  async function installApk(release: ApkRelease) {
    const file = new File(Paths.cache, "update.apk");
    if (file.exists) file.delete();
    const task = File.createDownloadTask(release.apkUrl, file, {
      onProgress: ({ bytesWritten, totalBytes }) =>
        setApkProgress(bytesWritten / (totalBytes > 0 ? totalBytes : release.size)),
    });
    taskRef.current = task;
    const downloaded = await task.downloadAsync();
    if (downloaded === null) return;
    // Android only opens files from other apps through a content address it grants access to.
    await startActivityAsync("android.intent.action.VIEW", {
      data: await getContentUriAsync(downloaded.uri),
      type: "application/vnd.android.package-archive",
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    });
    onClose();
  }

  async function install() {
    setPhase("downloading");
    setApkProgress(0);
    try {
      if (update.kind === "apk") await installApk(update.release);
      else await installOverTheAir();
    } catch (error) {
      // Cancelling rejects the download too; the dialog is already closing then.
      if (taskRef.current === null) return;
      if (__DEV__) console.error(error);
      setPhase("failed");
    }
  }

  function cancel() {
    const task = taskRef.current;
    taskRef.current = null;
    task?.cancel();
    onClose();
  }

  const sizeMb = update.kind === "apk" ? Math.ceil(update.release.size / MB) : 0;
  const message =
    phase === "failed"
      ? t.update.failed
      : phase === "downloading"
        ? update.kind === "apk"
          ? t.update.downloadingApk(
              Math.round(progress * 100),
              Math.round((progress * update.release.size) / MB),
              sizeMb,
            )
          : t.update.downloading
        : update.kind === "apk"
          ? t.update.apkMessage(update.release.version, sizeMb)
          : t.update.message;

  return (
    <ConfirmDialog
      visible
      title={t.update.title}
      message={message}
      cancelLabel={phase === "downloading" ? t.update.cancel : t.update.later}
      confirmLabel={phase === "failed" ? t.update.retry : t.update.install}
      onCancel={cancel}
      onConfirm={phase === "downloading" ? () => undefined : install}
      isDestructive={false}
    >
      {phase === "downloading" && (
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        >
          <View style={[styles.bar, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      )}
    </ConfirmDialog>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    track: {
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
      backgroundColor: colors.surfaceContainer,
    },
    bar: {
      height: "100%",
      backgroundColor: colors.primary,
    },
  });
}
