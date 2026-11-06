import { type AndroidSymbol, type SFSymbol, SymbolView } from "expo-symbols";
import type { ColorValue } from "react-native";

// The icons the app uses, by our own name.
// Android (and web) draw Google's Material Symbols; iOS draws Apple's SF Symbols.
// Both name types are checked by TypeScript, so a misspelled icon name fails `tsc`.
const ICONS = {
  add: { ios: "plus", android: "add" },
  check: { ios: "checkmark", android: "check" },
  chevronRight: { ios: "chevron.right", android: "chevron_right" },
  close: { ios: "xmark", android: "close" },
  collapseAll: { ios: "rectangle.compress.vertical", android: "unfold_less" },
  copy: { ios: "doc.on.doc", android: "content_copy" },
  reorder: { ios: "arrow.up.arrow.down", android: "swap_vert" },
  search: { ios: "magnifyingglass", android: "search" },
  delete: { ios: "trash", android: "delete" },
  drag: { ios: "line.3.horizontal", android: "drag_indicator" },
  edit: { ios: "pencil", android: "edit" },
  expandMore: { ios: "chevron.down", android: "expand_more" },
  folder: { ios: "folder", android: "folder" },
  folderOpen: { ios: "folder.fill", android: "folder_open" },
  home: { ios: "house", android: "home" },
  key: { ios: "key", android: "key" },
  moreActions: { ios: "ellipsis", android: "more_vert" },
  newFolder: { ios: "folder.badge.plus", android: "create_new_folder" },
  newPassword: { ios: "key.horizontal", android: "password" },
  settings: { ios: "gearshape", android: "settings" },
  show: { ios: "eye", android: "visibility" },
  hide: { ios: "eye.slash", android: "visibility_off" },
  backup: { ios: "externaldrive", android: "backup" },
  fingerprint: { ios: "touchid", android: "fingerprint" },
  info: { ios: "info.circle", android: "info" },
  language: { ios: "globe", android: "language" },
  screenshot: { ios: "camera.viewfinder", android: "screenshot" },
  theme: { ios: "paintpalette", android: "palette" },
  timer: { ios: "timer", android: "timer" },
  selected: { ios: "checkmark.circle.fill", android: "check_circle" },
  notSelected: { ios: "circle", android: "radio_button_unchecked" },
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  color: ColorValue;
  size?: number;
};

// Icons are decoration: the text or accessibilityLabel next to them says what they mean.
export function Icon({ name, color, size = 24 }: IconProps) {
  const icon = ICONS[name];
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android, web: icon.android }}
      tintColor={color}
      size={size}
    />
  );
}
