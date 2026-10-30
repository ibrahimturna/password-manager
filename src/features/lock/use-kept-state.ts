import { router, useRootNavigationState, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import type { FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { keptState } from "./kept-state";

// How long screens reopen without their slide animation after unlocking.
const RESTORE_MS = 500;

// Like useState, but the value comes back after a lock. Forgotten when the screen closes.
export function useKeptState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => keptState.read(key, initialValue));

  useEffect(() => {
    keptState.write(key, value);
  }, [key, value]);

  useEffect(() => () => keptState.forget(key), [key]);

  return [value, setValue] as const;
}

// Remembers that this screen is open, so it can reopen after a lock.
export function useKeptRoute(currentRoute: Href) {
  // The first value is kept, so adding and removing use the same object.
  const [route] = useState(currentRoute);

  useEffect(() => {
    keptState.addRoute(route);
    return () => keptState.removeRoute(route);
  }, [route]);
}

// Reopens the screens that were open when the vault locked. Returns true while it does,
// so they appear at once instead of sliding in one after another.
export function useRestoreRoutes() {
  const [isRestoring, setIsRestoring] = useState(() => keptState.hasRoutes());
  // The router cannot navigate until the navigator has its state.
  const navigationKey = useRootNavigationState()?.key;

  useEffect(() => {
    if (navigationKey === undefined) return;
    for (const route of keptState.takeRoutes()) router.push(route);
    const timer = setTimeout(() => setIsRestoring(false), RESTORE_MS);
    return () => clearTimeout(timer);
  }, [navigationKey]);

  return isRestoring;
}

// Props for a FlatList that returns to its scroll position after a lock. A FlatList only
// draws the rows near the screen, so a long list cannot jump there at once: each time more
// rows appear it scrolls further, until it arrives or the user takes over.
export function useKeptScroll<T>(key: string) {
  const listRef = useRef<FlatList<T>>(null);
  // The position still to reach. 0 means there is nothing to restore.
  const targetRef = useRef(keptState.read(key, 0));
  const viewportHeightRef = useRef(0);

  useEffect(() => () => keptState.forget(key), [key]);

  return {
    ref: listRef,
    scrollEventThrottle: 100,
    onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
      if (targetRef.current === 0) keptState.write(key, event.nativeEvent.contentOffset.y);
    },
    onLayout(event: LayoutChangeEvent) {
      viewportHeightRef.current = event.nativeEvent.layout.height;
    },
    onContentSizeChange(_width: number, height: number) {
      const target = targetRef.current;
      if (target === 0) return;
      listRef.current?.scrollToOffset({ offset: target, animated: false });
      const viewportHeight = viewportHeightRef.current;
      if (viewportHeight > 0 && height - viewportHeight >= target) targetRef.current = 0;
    },
    onScrollBeginDrag() {
      targetRef.current = 0;
    },
  };
}
