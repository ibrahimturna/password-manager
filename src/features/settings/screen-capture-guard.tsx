import {
  addScreenshotListener,
  allowScreenCaptureAsync,
  preventScreenCaptureAsync,
} from "expo-screen-capture";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { setHiddenInRecents } from "../../../modules/password-autofill";

import { Snackbar } from "@/components/snackbar";
import { useTranslation } from "@/i18n/use-translation";

import { useSettings } from "./settings-context";

const HINT_MS = 4000;

// Blocks screenshots unless the user allowed them. Android then also blanks the app in recent
// apps, whatever `recents` says; that setting only matters while screenshots are allowed.
// Android may not report an attempt on a blocked screen, so the hint is a bonus: Settings
// explains the option too.
export function ScreenCaptureGuard({ children }: { children: ReactNode }) {
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { screenCapture, recents } = useSettings();
  const [isHintVisible, setIsHintVisible] = useState(false);

  useEffect(() => {
    setHiddenInRecents(recents === "hidden");
  }, [recents]);

  useEffect(() => {
    if (screenCapture === "allowed") return;
    void preventScreenCaptureAsync();
    const subscription = addScreenshotListener(() => setIsHintVisible(true));
    return () => {
      subscription.remove();
      setIsHintVisible(false);
      void allowScreenCaptureAsync();
    };
  }, [screenCapture]);

  useEffect(() => {
    if (!isHintVisible) return;
    const timer = setTimeout(() => setIsHintVisible(false), HINT_MS);
    return () => clearTimeout(timer);
  }, [isHintVisible]);

  return (
    <View style={styles.root}>
      {children}
      {isHintVisible && (
        <Snackbar message={t.settings.screenshotBlocked} bottom={insets.bottom + 16} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
