import * as Updates from "expo-updates";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslation } from "@/i18n/use-translation";
import { useTheme } from "@/theme/use-theme";

// Updates only exist in installed builds. A development build loads its code from the
// development server instead, and the update functions reject there.
export const canUpdate = Updates.isEnabled && !__DEV__;

export async function isUpdateAvailable(): Promise<boolean> {
  return (await Updates.checkForUpdateAsync()).isAvailable;
}

// Locking removes every screen, which would ask again after each unlock. Once per start is enough.
let hasCheckedOnStart = false;

// Asks once per app start when a newer version is published.
export function UpdatePrompt() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!canUpdate || hasCheckedOnStart) return;
    hasCheckedOnStart = true;
    // Offline or the server is down: the user can still check from Settings.
    isUpdateAvailable().then(setIsOpen, () => undefined);
  }, []);

  return isOpen ? <UpdateDialog onClose={() => setIsOpen(false)} /> : null;
}

// Downloads the update, then restarts the app with it. Restarting locks the vault.
export function UpdateDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslation();
  const { colors } = useTheme();
  const [phase, setPhase] = useState<"ask" | "downloading" | "failed">("ask");

  async function install() {
    setPhase("downloading");
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      if (__DEV__) console.error(error);
      setPhase("failed");
    }
  }

  return (
    <ConfirmDialog
      visible
      title={t.update.title}
      message={
        phase === "ask"
          ? t.update.message
          : phase === "downloading"
            ? t.update.downloading
            : t.update.failed
      }
      cancelLabel={t.update.later}
      confirmLabel={phase === "failed" ? t.update.retry : t.update.install}
      onCancel={onClose}
      onConfirm={phase === "downloading" ? () => undefined : install}
      isDestructive={false}
    >
      {phase === "downloading" && <ActivityIndicator color={colors.primary} />}
    </ConfirmDialog>
  );
}
