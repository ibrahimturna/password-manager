import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

import type { Palette } from "@/theme/colors";
import { useTheme } from "@/theme/use-theme";

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const BORDER = 2;
const THUMB_ON = 24;
const THUMB_OFF = 16;
const ANIMATION_MS = 120;

type AppSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

// A Material 3 switch in the app's colours. React Native's own one always uses the phone's
// accent colour, and its shape cannot be changed.
export function AppSwitch({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
}: AppSwitchProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // 0 is off and 1 is on. Kept in state so it is created once and survives redraws.
  const [progress] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: ANIMATION_MS,
      // The thumb's size changes, which the native driver cannot animate.
      useNativeDriver: false,
    }).start();
  }, [progress, value]);

  const size = progress.interpolate({ inputRange: [0, 1], outputRange: [THUMB_OFF, THUMB_ON] });
  const inner = TRACK_HEIGHT - BORDER * 2;
  const left = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [(inner - THUMB_OFF) / 2, TRACK_WIDTH - BORDER * 2 - THUMB_ON - (inner - THUMB_ON) / 2],
  });
  const top = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [(inner - THUMB_OFF) / 2, (inner - THUMB_ON) / 2],
  });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={8}
      style={[styles.track, value && styles.trackOn, disabled && styles.disabled]}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View
        style={[
          styles.thumb,
          value && styles.thumbOn,
          { width: size, height: size, left, top },
        ]}
      />
    </Pressable>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    track: {
      width: TRACK_WIDTH,
      height: TRACK_HEIGHT,
      borderWidth: BORDER,
      borderRadius: TRACK_HEIGHT / 2,
      borderColor: colors.switchOffOutline,
      backgroundColor: colors.switchOffTrack,
    },
    trackOn: {
      borderColor: colors.switchOnTrack,
      backgroundColor: colors.switchOnTrack,
    },
    thumb: {
      position: "absolute",
      borderRadius: THUMB_ON / 2,
      backgroundColor: colors.switchOffOutline,
    },
    thumbOn: {
      backgroundColor: colors.switchOnThumb,
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
