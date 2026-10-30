import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { PasswordInput } from "@/components/password-input";
import { SegmentedControl } from "@/components/segmented-control";
import { useVault } from "@/data/vault-context";
import { useKeptRoute } from "@/features/lock/use-kept-state";
import { useSettings } from "@/features/settings/settings-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

export default function SettingsScreen() {
  const {
    language,
    theme,
    autoLock,
    screenCapture,
    setLanguage,
    setTheme,
    setAutoLock,
    setScreenCapture,
  } = useSettings();
  const { lock, masterPassword, deviceLockAvailable, deviceLockOn, setDeviceLockOn, verifyUser } =
    useVault();
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);
  useKeptRoute("/settings");

  // Turning the phone lock on first checks that it really works.
  async function changeDeviceLock(on: boolean) {
    if (on && !(await verifyUser(t.lock.devicePrompt))) return;
    await setDeviceLockOn(on);
  }

  // Being here means the vault is unlocked. Allowing screenshots also asks for the phone's
  // lock when it is in use, so someone picking up an open phone cannot do it silently.
  async function changeScreenCapture(allowed: boolean) {
    if (allowed && deviceLockOn && !(await verifyUser(t.lock.devicePrompt))) return;
    setScreenCapture(allowed ? "allowed" : "blocked");
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settings.language}</Text>
        <SegmentedControl
          options={[
            { value: "device", label: t.settings.device },
            // Language names are always written in their own language, so they are not translated.
            { value: "tr", label: "Türkçe" },
            { value: "en", label: "English" },
          ]}
          value={language}
          onChange={setLanguage}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settings.theme}</Text>
        <SegmentedControl
          options={[
            { value: "device", label: t.settings.device },
            { value: "light", label: t.settings.light },
            { value: "dark", label: t.settings.dark },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settings.security}</Text>

        <Text style={styles.label}>{t.settings.masterPassword}</Text>
        <PasswordInput
          value={masterPassword}
          onChangeText={() => undefined}
          editable={false}
          label={t.settings.masterPassword}
          showLabel={t.lock.showPassword}
          hideLabel={t.lock.hidePassword}
        />
        <Pressable
          onPress={() => router.push("/master-password")}
          style={styles.textButton}
          accessibilityRole="button"
        >
          <Text style={styles.textButtonLabel}>{t.settings.changeMasterPassword}</Text>
        </Pressable>

        {deviceLockAvailable && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t.settings.deviceLock}</Text>
            <Switch
              value={deviceLockOn}
              onValueChange={changeDeviceLock}
              accessibilityLabel={t.settings.deviceLock}
            />
          </View>
        )}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t.settings.allowScreenshots}</Text>
          <Switch
            value={screenCapture === "allowed"}
            onValueChange={changeScreenCapture}
            accessibilityLabel={t.settings.allowScreenshots}
          />
        </View>
        <Text style={styles.note}>{t.settings.allowScreenshotsNote}</Text>

        <Text style={styles.label}>{t.settings.autoLock}</Text>
        <SegmentedControl
          options={[
            { value: "immediately", label: t.settings.immediately },
            { value: "1min", label: t.settings.oneMinute },
            { value: "5min", label: t.settings.fiveMinutes },
          ]}
          value={autoLock}
          onChange={setAutoLock}
        />

        <Pressable onPress={lock} style={styles.textButton} accessibilityRole="button">
          <Text style={styles.textButtonLabel}>{t.settings.lockNow}</Text>
        </Pressable>
      </View>

      <Text style={styles.note}>{t.settings.mockNotice}</Text>
    </ScrollView>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    content: {
      padding: 16,
      gap: 24,
    },
    section: {
      gap: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.onSurface,
    },
    label: {
      marginTop: 8,
      color: colors.onSurfaceVariant,
    },
    note: {
      color: colors.onSurfaceVariant,
    },
    textButton: {
      alignSelf: "flex-start",
      paddingVertical: 8,
    },
    textButtonLabel: {
      fontSize: 16,
      color: colors.primary,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 8,
    },
    switchLabel: {
      flex: 1,
      fontSize: 15,
      color: colors.onSurface,
    },
  });
}
