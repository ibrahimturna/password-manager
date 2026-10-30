import type { ThemeSetting } from "@/features/settings/settings-context";

export type ColorScheme = "light" | "dark";

// Turns the user's theme setting into light or dark.
// "device" follows the phone. The phone may not report a scheme (null); then we use light.
export function resolveColorScheme(
  setting: ThemeSetting,
  deviceScheme: ColorScheme | null,
): ColorScheme {
  if (setting !== "device") {
    return setting;
  }
  return deviceScheme ?? "light";
}
