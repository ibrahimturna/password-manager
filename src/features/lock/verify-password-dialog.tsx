import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { PasswordInput } from "@/components/password-input";
import { useVault } from "@/data/vault-context";
import { useTranslation } from "@/i18n/use-translation";
import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

type VerifyPasswordDialogProps = {
  onCancel: () => void;
  onVerified: () => void;
};

// Asks for the master password, for when the phone lock is off.
export function VerifyPasswordDialog({ onCancel, onVerified }: VerifyPasswordDialogProps) {
  const t = useTranslation();
  const styles = createStyles(useTheme().colors);
  const { masterPassword } = useVault();
  const [password, setPassword] = useState("");
  const [isWrong, setIsWrong] = useState(false);

  function verify() {
    if (password === masterPassword) {
      onVerified();
    } else {
      setIsWrong(true);
    }
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.centered}>
        <Pressable style={styles.scrim} onPress={onCancel} accessible={false} />
        <View style={styles.card}>
          <Text style={styles.title}>{t.masterPasswordForm.verifyPrompt}</Text>
          <PasswordInput
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setIsWrong(false);
            }}
            label={t.masterPasswordForm.current}
            showLabel={t.lock.showPassword}
            hideLabel={t.lock.hidePassword}
            onSubmitEditing={verify}
          />
          {isWrong && <Text style={styles.error}>{t.masterPasswordForm.wrongCurrent}</Text>}
          <View style={styles.buttons}>
            <Pressable onPress={onCancel} style={styles.button} accessibilityRole="button">
              <Text style={styles.cancelText}>{t.masterPasswordForm.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={verify}
              style={[styles.button, styles.confirmButton]}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>{t.lock.unlock}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
    },
    scrim: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: "rgba(0, 0, 0, 0.32)",
    },
    card: {
      padding: 24,
      gap: 16,
      borderRadius: 28,
      backgroundColor: colors.surfaceContainerHigh,
      elevation: 6,
    },
    title: {
      fontSize: 22,
      color: colors.onSurface,
    },
    error: {
      color: colors.error,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
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
    confirmButton: {
      backgroundColor: colors.primary,
    },
    confirmText: {
      fontSize: 16,
      color: colors.onPrimary,
    },
  });
}
