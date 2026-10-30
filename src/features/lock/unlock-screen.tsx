import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, Text, View } from "react-native";

import { PasswordInput } from "@/components/password-input";
import { useTranslation } from "@/i18n/use-translation";
import { useTheme } from "@/theme/use-theme";

import { createLockStyles } from "./lock-screen-styles";

type UnlockScreenProps = {
  isDeviceLockOn: boolean;
  // Resolves to false when the password is wrong.
  onUnlockWithPassword: (password: string) => Promise<boolean>;
  onUnlockWithDeviceLock: () => Promise<void>;
};

// Shown whenever the vault is locked.
export function UnlockScreen({
  isDeviceLockOn,
  onUnlockWithPassword,
  onUnlockWithDeviceLock,
}: UnlockScreenProps) {
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = createLockStyles(colors);
  const [password, setPassword] = useState("");
  const [isWrong, setIsWrong] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Offer the phone lock straight away, once per visit to this screen.
  // The vault can lock while the app is in the background, where Android cannot show the
  // prompt, so in that case wait until the user comes back.
  const hasAskedRef = useRef(false);
  useEffect(() => {
    if (!isDeviceLockOn) return;

    function ask() {
      if (hasAskedRef.current) return;
      hasAskedRef.current = true;
      void onUnlockWithDeviceLock();
    }

    if (AppState.currentState === "active") {
      ask();
      return;
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") ask();
    });
    return () => subscription.remove();
  }, [isDeviceLockOn, onUnlockWithDeviceLock]);

  async function unlock() {
    if (password === "" || isBusy) return;
    setIsBusy(true);
    const isRight = await onUnlockWithPassword(password);
    if (!isRight) {
      setIsWrong(true);
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t.lock.unlockTitle}</Text>

      <Text style={styles.label}>{t.lock.masterPassword}</Text>
      <PasswordInput
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setIsWrong(false);
        }}
        label={t.lock.masterPassword}
        showLabel={t.lock.showPassword}
        hideLabel={t.lock.hidePassword}
        onSubmitEditing={unlock}
      />
      {isWrong && <Text style={styles.error}>{t.lock.wrongPassword}</Text>}

      <Pressable
        onPress={unlock}
        disabled={isBusy}
        style={styles.primaryButton}
        accessibilityRole="button"
      >
        {isBusy ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.primaryText}>{t.lock.unlock}</Text>
        )}
      </Pressable>

      {isDeviceLockOn && (
        <Pressable
          onPress={onUnlockWithDeviceLock}
          style={styles.secondaryButton}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>{t.lock.useDeviceLockButton}</Text>
        </Pressable>
      )}
    </View>
  );
}
