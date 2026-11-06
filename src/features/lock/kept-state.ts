import type { Href } from "expo-router";

// What the user was doing when the vault locked, so it can come back after unlocking.
// Locking removes every screen, so this has to live outside them. It is only in memory:
// when Android closes the app it is gone. Screens delete their own entries when they close
// normally; during a lock they keep them.
export function createKeptState() {
  const values = new Map<string, unknown>();
  let routes: Href[] = [];
  let isLocking = false;

  return {
    startLocking() {
      isLocking = true;
    },

    finishUnlocking() {
      isLocking = false;
    },

    // The cast is safe because each key is used by one screen, always with the same type.
    read<T>(key: string, fallback: T): T {
      return values.has(key) ? (values.get(key) as T) : fallback;
    },

    write(key: string, value: unknown) {
      values.set(key, value);
    },

    forget(key: string) {
      if (!isLocking) values.delete(key);
    },

    addRoute(route: Href) {
      routes = [...routes, route];
    },

    removeRoute(route: Href) {
      if (!isLocking) routes = routes.filter((kept) => kept !== route);
    },

    hasRoutes() {
      return routes.length > 0;
    },

    // Empties the list: the screens add themselves again when they reopen.
    takeRoutes(): Href[] {
      const taken = routes;
      routes = [];
      return taken;
    },
  };
}

export const keptState = createKeptState();

// Set by Settings once the user has confirmed it is them. The master password screen only
// opens with it, so a link into the app cannot reach that screen directly.
export const MASTER_PASSWORD_PASS = "master-password.pass";
