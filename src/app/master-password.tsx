import { Redirect, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PasswordInput } from "@/components/password-input";
import { useVault } from "@/data/vault-context";
import { MASTER_PASSWORD_PASS } from "@/features/lock/kept-state";
import { checkNewPassword, type NewPasswordError } from "@/features/lock/lock-rules";
import { useKeptRoute, useKeptState } from "@/features/lock/use-kept-state";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

// Shows and changes the master password. Settings confirms it is the user before opening this.
export default function MasterPasswordScreen() {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { masterPassword, changeMasterPassword } = useVault();

  useKeptRoute("/master-password");

  const [hasPass] = useKeptState(MASTER_PASSWORD_PASS, false);
  // What the user typed comes back after a lock.
  const [password, setPassword] = useKeptState("master-password.password", "");
  const [repeat, setRepeat] = useKeptState("master-password.repeat", "");
  const [error, setError] = useState<NewPasswordError | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function save() {
    const problem = checkNewPassword(password, repeat);
    setError(problem);
    if (problem !== null) return;

    setIsBusy(true);
    await changeMasterPassword(password);
    router.back();
  }

  if (!hasPass) return <Redirect href="/" />;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>{t.settings.masterPassword}</Text>
      <PasswordInput
        value={masterPassword}
        onChangeText={() => undefined}
        editable={false}
        label={t.settings.masterPassword}
        showLabel={t.lock.showPassword}
        hideLabel={t.lock.hidePassword}
      />

      <Text style={styles.label}>{t.masterPasswordForm.new}</Text>
      <PasswordInput
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError(null);
        }}
        label={t.masterPasswordForm.new}
        showLabel={t.lock.showPassword}
        hideLabel={t.lock.hidePassword}
      />

      <Text style={styles.label}>{t.masterPasswordForm.repeat}</Text>
      <PasswordInput
        value={repeat}
        onChangeText={(text) => {
          setRepeat(text);
          setError(null);
        }}
        label={t.masterPasswordForm.repeat}
        showLabel={t.lock.showPassword}
        hideLabel={t.lock.hidePassword}
      />
      {error !== null && (
        <Text style={styles.error}>
          {error === "empty" ? t.lock.passwordRequired : t.lock.passwordsDiffer}
        </Text>
      )}

      <View style={styles.buttons}>
        <Pressable onPress={() => router.back()} style={styles.button} accessibilityRole="button">
          <Text style={styles.cancelText}>{t.masterPasswordForm.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={isBusy}
          style={[styles.button, styles.saveButton]}
          accessibilityRole="button"
        >
          {isBusy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.saveText}>{t.masterPasswordForm.save}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    content: {
      padding: 16,
      gap: 8,
    },
    label: {
      marginTop: 8,
      color: colors.onSurfaceVariant,
    },
    error: {
      color: colors.error,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 12,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
    },
    cancelText: {
      fontSize: 16,
      color: colors.primary,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    saveText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
  });
}
