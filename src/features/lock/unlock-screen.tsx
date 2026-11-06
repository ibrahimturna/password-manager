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
  // True while the prompt must not open by itself, because another window is using it.
  shouldHoldPrompt?: () => boolean;
};

// Shown whenever the vault is locked.
export function UnlockScreen({
  isDeviceLockOn,
  onUnlockWithPassword,
  onUnlockWithDeviceLock,
  shouldHoldPrompt,
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
      if (hasAskedRef.current || shouldHoldPrompt?.() === true) return;
      hasAskedRef.current = true;
      void unlockWithDevice();
    }

    if (AppState.currentState === "active") ask();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") ask();
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unlockWithDevice only wraps onUnlockWithDeviceLock.
  }, [isDeviceLockOn, onUnlockWithDeviceLock, shouldHoldPrompt]);

  // Shows the spinner while the vault opens. Cancelling the prompt hides it again.
  async function unlockWithDevice() {
    setIsBusy(true);
    await onUnlockWithDeviceLock();
    setIsBusy(false);
  }

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
          onPress={unlockWithDevice}
          disabled={isBusy}
          style={styles.secondaryButton}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>{t.lock.useDeviceLockButton}</Text>
        </Pressable>
      )}
    </View>
  );
}
