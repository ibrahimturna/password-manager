import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isAutofillProvider, openAutofillProviderSettings } from "../../modules/password-autofill";

import { AppSwitch } from "@/components/app-switch";
import { ChoiceDialog } from "@/components/choice-dialog";
import { SettingsDivider, SettingsRow } from "@/components/settings-row";
import { useVault } from "@/data/vault-context";
import { keptState, MASTER_PASSWORD_PASS } from "@/features/lock/kept-state";
import { useKeptRoute } from "@/features/lock/use-kept-state";
import { VerifyPasswordDialog } from "@/features/lock/verify-password-dialog";
import {
  type AvailableUpdate,
  canUpdate,
  findUpdate,
  UpdateDialog,
} from "@/features/settings/app-update";
import { useSettings } from "@/features/settings/settings-context";
import { useTranslation } from "@/i18n/use-translation";
import { useTheme } from "@/theme/use-theme";

type OpenChoice = "language" | "theme" | "autoLock" | null;

// Older versions can only hide the app by also blocking screenshots.
const canChooseRecents = Platform.OS === "android" && Number(Platform.Version) >= 33;

export default function SettingsScreen() {
  const {
    language,
    theme,
    autoLock,
    screenCapture,
    recents,
    setLanguage,
    setTheme,
    setAutoLock,
    setScreenCapture,
    setRecents,
  } = useSettings();
  const { deviceLockAvailable, deviceLockOn, setDeviceLockOn, verifyUser } = useVault();
  const t = useTranslation();
  const { colors } = useTheme();
  useKeptRoute("/settings");
  const insets = useSafeAreaInsets();
  const [updateCheck, setUpdateCheck] = useState<"idle" | "checking" | "upToDate" | "failed">(
    "idle",
  );
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [isAutofillOn, setIsAutofillOn] = useState(isAutofillProvider);
  const [isAutofillMissing, setIsAutofillMissing] = useState(false);
  const [isAskingPassword, setIsAskingPassword] = useState(false);
  const [openChoice, setOpenChoice] = useState<OpenChoice>(null);

  // Language names are always written in their own language, so they are not translated.
  const languages = [
    { value: "device" as const, label: t.settings.device },
    { value: "tr" as const, label: "Türkçe" },
    { value: "en" as const, label: "English" },
  ];
  const themes = [
    { value: "device" as const, label: t.settings.device },
    { value: "light" as const, label: t.settings.light },
    { value: "dark" as const, label: t.settings.dark },
  ];
  const autoLocks = [
    { value: "immediately" as const, label: t.settings.immediately },
    { value: "1min" as const, label: t.settings.oneMinute },
    { value: "5min" as const, label: t.settings.fiveMinutes },
  ];

  function getLabel<T extends string>(options: { value: T; label: string }[], value: T) {
    return options.find((option) => option.value === value)?.label;
  }

  function openMasterPassword() {
    setIsAskingPassword(false);
    keptState.write(MASTER_PASSWORD_PASS, true);
    router.push("/master-password");
  }

  // The master password is the one setting that asks again, before its screen opens.
  async function askForMasterPassword() {
    if (!deviceLockOn) {
      setIsAskingPassword(true);
    } else if (await verifyUser(t.masterPasswordForm.verifyPrompt)) {
      openMasterPassword();
    }
  }

  // The user changes this in Android's settings, so it is checked again on coming back.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setIsAutofillOn(isAutofillProvider());
    });
    return () => subscription.remove();
  }, []);

  async function checkForUpdate() {
    setUpdateCheck("checking");
    try {
      const found = await findUpdate();
      setUpdateCheck(found !== null ? "idle" : "upToDate");
      setUpdate(found);
    } catch {
      setUpdateCheck("failed");
    }
  }

  function getVersionNote(): string {
    if (!canUpdate) return t.update.devOnly;
    switch (updateCheck) {
      case "idle":
        return t.update.tapToCheck;
      case "checking":
        return t.update.checking;
      case "upToDate":
        return t.update.upToDate;
      case "failed":
        return t.update.checkFailed;
    }
  }

  function turnOnAutofill() {
    setIsAutofillMissing(!openAutofillProviderSettings());
  }

  return (
    // The app draws behind Android's navigation bar, so the last row needs room above it.
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
      <SettingsRow
        icon="language"
        title={t.settings.language}
        subtitle={getLabel(languages, language)}
        onPress={() => setOpenChoice("language")}
      />
      <SettingsRow
        icon="theme"
        title={t.settings.theme}
        subtitle={getLabel(themes, theme)}
        onPress={() => setOpenChoice("theme")}
      />
      <SettingsDivider />

      <SettingsRow
        icon="newPassword"
        title={t.settings.masterPassword}
        subtitle={t.settings.masterPasswordNote}
        onPress={askForMasterPassword}
      />
      {deviceLockAvailable && (
        <SettingsRow
          icon="fingerprint"
          title={t.settings.deviceLock}
          subtitle={t.settings.deviceLockNote}
        >
          <AppSwitch
            value={deviceLockOn}
            onValueChange={setDeviceLockOn}
            accessibilityLabel={t.settings.deviceLock}
          />
        </SettingsRow>
      )}
      <SettingsRow
        icon="screenshot"
        title={t.settings.allowScreenshots}
        subtitle={t.settings.allowScreenshotsNote}
      >
        <AppSwitch
          value={screenCapture === "allowed"}
          onValueChange={(allowed) => setScreenCapture(allowed ? "allowed" : "blocked")}
          accessibilityLabel={t.settings.allowScreenshots}
        />
      </SettingsRow>
      {canChooseRecents && (
        <SettingsRow
          icon="hide"
          title={t.settings.hideInRecents}
          subtitle={
            screenCapture === "blocked"
              ? t.settings.hideInRecentsForced
              : t.settings.hideInRecentsNote
          }
        >
          <AppSwitch
            // Android always hides the app while screenshots are blocked.
            value={screenCapture === "blocked" || recents === "hidden"}
            onValueChange={(hidden) => setRecents(hidden ? "hidden" : "shown")}
            disabled={screenCapture === "blocked"}
            accessibilityLabel={t.settings.hideInRecents}
          />
        </SettingsRow>
      )}
      <SettingsRow
        icon="timer"
        title={t.settings.autoLock}
        subtitle={getLabel(autoLocks, autoLock)}
        onPress={() => setOpenChoice("autoLock")}
      />
      <SettingsDivider />

      {isAutofillOn ? (
        <SettingsRow icon="key" title={t.autofill.onTitle} subtitle={t.autofill.onNote} />
      ) : (
        <SettingsRow
          icon="key"
          title={t.autofill.turnOn}
          subtitle={isAutofillMissing ? t.autofill.turnOnFailed : t.autofill.turnOnNote}
          onPress={turnOnAutofill}
        />
      )}
      <SettingsRow
        icon="backup"
        title={t.backup.title}
        subtitle={t.settings.backupNote}
        onPress={() => router.push("/backup")}
      />
      <SettingsDivider />

      <SettingsRow
        icon="info"
        title={t.settings.version}
        subtitle={`${Constants.expoConfig?.version ?? ""} · ${getVersionNote()}`}
        onPress={canUpdate && updateCheck !== "checking" ? checkForUpdate : undefined}
      >
        {updateCheck === "checking" && <ActivityIndicator color={colors.primary} />}
      </SettingsRow>
      {update !== null && <UpdateDialog update={update} onClose={() => setUpdate(null)} />}

      {isAskingPassword && (
        <VerifyPasswordDialog
          onCancel={() => setIsAskingPassword(false)}
          onVerified={openMasterPassword}
        />
      )}
      <ChoiceDialog
        visible={openChoice === "language"}
        title={t.settings.language}
        options={languages}
        value={language}
        cancelLabel={t.settings.cancel}
        onChoose={(value) => {
          setLanguage(value);
          setOpenChoice(null);
        }}
        onCancel={() => setOpenChoice(null)}
      />
      <ChoiceDialog
        visible={openChoice === "theme"}
        title={t.settings.theme}
        options={themes}
        value={theme}
        cancelLabel={t.settings.cancel}
        onChoose={(value) => {
          setTheme(value);
          setOpenChoice(null);
        }}
        onCancel={() => setOpenChoice(null)}
      />
      <ChoiceDialog
        visible={openChoice === "autoLock"}
        title={t.settings.autoLock}
        options={autoLocks}
        value={autoLock}
        cancelLabel={t.settings.cancel}
        onChoose={(value) => {
          setAutoLock(value);
          setOpenChoice(null);
        }}
        onCancel={() => setOpenChoice(null)}
      />
    </ScrollView>
  );
}
