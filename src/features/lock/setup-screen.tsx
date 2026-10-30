import { useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";

import { PasswordInput } from "@/components/password-input";
import { useTranslation } from "@/i18n/use-translation";
import { useTheme } from "@/theme/use-theme";

import { checkNewPassword, type NewPasswordError } from "./lock-rules";
import { createLockStyles } from "./lock-screen-styles";

type SetupScreenProps = {
  canUseDeviceLock: boolean;
  onSetUp: (password: string, useDeviceLock: boolean) => Promise<void>;
};

// Shown once, on the first start: creates the master password.
export function SetupScreen({ canUseDeviceLock, onSetUp }: SetupScreenProps) {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createLockStyles(colors);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [useDeviceLock, setUseDeviceLock] = useState(canUseDeviceLock);
  const [error, setError] = useState<NewPasswordError | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function create() {
    const problem = checkNewPassword(password, repeat);
    setError(problem);
    if (problem !== null) return;
    setIsBusy(true);
    await onSetUp(password, useDeviceLock);
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t.lock.setupTitle}</Text>
      <Text style={styles.message}>{t.lock.setupMessage}</Text>

      <Text style={styles.label}>{t.lock.masterPassword}</Text>
      <PasswordInput
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError(null);
        }}
        label={t.lock.masterPassword}
        showLabel={t.lock.showPassword}
        hideLabel={t.lock.hidePassword}
      />

      <Text style={styles.label}>{t.lock.repeatPassword}</Text>
      <PasswordInput
        value={repeat}
        onChangeText={(text) => {
          setRepeat(text);
          setError(null);
        }}
        label={t.lock.repeatPassword}
        showLabel={t.lock.showPassword}
        hideLabel={t.lock.hidePassword}
        onSubmitEditing={create}
      />
      {error !== null && (
        <Text style={styles.error}>
          {error === "empty" ? t.lock.passwordRequired : t.lock.passwordsDiffer}
        </Text>
      )}

      {canUseDeviceLock && (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t.lock.useDeviceLock}</Text>
          <Switch
            value={useDeviceLock}
            onValueChange={setUseDeviceLock}
            accessibilityLabel={t.lock.useDeviceLock}
          />
        </View>
      )}

      <Pressable
        onPress={create}
        disabled={isBusy}
        style={styles.primaryButton}
        accessibilityRole="button"
      >
        {isBusy ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.primaryText}>{t.lock.createVault}</Text>
        )}
      </Pressable>
    </View>
  );
}
