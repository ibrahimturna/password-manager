// Colour palettes generated with Google's Material 3 colour tool
// (@material/material-color-utilities, standard "tonal spot" scheme, seed colour #1A73E8 blue).
// The names are Material 3 "colour roles": they describe a colour's job, not the colour itself.
// "onX" is the colour for text or icons drawn on top of X (e.g. onPrimary on a primary button).
export type Palette = {
  primary: string; // main buttons, links, icons that can be tapped
  onPrimary: string;
  primaryContainer: string; // soft highlight: selected rows, the round "+" button
  onPrimaryContainer: string;
  secondaryContainer: string; // calmer highlight: the selected option in a segmented control
  onSecondaryContainer: string;
  surface: string; // screen background
  surfaceContainer: string; // raised areas, such as an open "⋮" menu
  surfaceContainerHigh: string; // areas raised even more, such as the Undo bar
  onSurface: string; // normal text
  onSurfaceVariant: string; // less important text (hints, subtitles)
  outline: string; // borders that must be noticed (inputs, segmented control)
  outlineVariant: string; // quiet dividers between rows
  error: string;
  onError: string; // text on an error-coloured button (e.g. Delete)
  disabledContent: string; // text of something that cannot be used right now
  disabledContainer: string; // background of a disabled button
  switchOnTrack: string;
  switchOnThumb: string;
  switchOffTrack: string;
  switchOffOutline: string; // also the thumb of a switch that is off
};

export const lightColors: Palette = {
  primary: "#435E91",
  onPrimary: "#FFFFFF",
  primaryContainer: "#D8E2FF",
  onPrimaryContainer: "#2A4678",
  secondaryContainer: "#DBE2F9",
  onSecondaryContainer: "#3F4759",
  surface: "#F9F9FF",
  surfaceContainer: "#EDEDF4",
  surfaceContainerHigh: "#E8E7EE",
  onSurface: "#1A1B20",
  onSurfaceVariant: "#44474F",
  outline: "#74777F",
  outlineVariant: "#C4C6D0",
  error: "#BA1A1A",
  onError: "#FFFFFF",
  // onSurface at 38% and 12% opacity, as Material 3 recommends for disabled states.
  disabledContent: "rgba(26, 27, 32, 0.38)",
  disabledContainer: "rgba(26, 27, 32, 0.12)",
  switchOnTrack: "#435E91",
  switchOnThumb: "#FFFFFF",
  switchOffTrack: "#E2E2E9",
  switchOffOutline: "#74777F",
};

export const darkColors: Palette = {
  primary: "#ADC7FF",
  onPrimary: "#0F2F60",
  primaryContainer: "#2A4678",
  onPrimaryContainer: "#D8E2FF",
  secondaryContainer: "#3F4759",
  onSecondaryContainer: "#DBE2F9",
  surface: "#111318",
  surfaceContainer: "#1E1F25",
  surfaceContainerHigh: "#282A2F",
  onSurface: "#E2E2E9",
  onSurfaceVariant: "#C4C6D0",
  outline: "#8E9099",
  outlineVariant: "#44474F",
  error: "#FFB4AB",
  onError: "#690005",
  disabledContent: "rgba(226, 226, 233, 0.38)",
  disabledContainer: "rgba(226, 226, 233, 0.12)",
  switchOnTrack: "#BEC8D7",
  switchOnThumb: "#28303C",
  switchOffTrack: "#333538",
  switchOffOutline: "#8E9099",
};
