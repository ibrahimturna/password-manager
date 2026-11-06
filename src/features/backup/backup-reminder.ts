import Storage from "expo-sqlite/kv-store";

const DAY_MS = 24 * 60 * 60 * 1000;
// A reminder appears when the last backup is older than this.
export const REMIND_AFTER_MS = 30 * DAY_MS;
// "Later" hides the reminder for this long.
export const SNOOZE_MS = 7 * DAY_MS;

// Not secret, so kept with the other settings outside the vault.
const LAST_BACKUP_KEY = "backup.lastAt";
const SNOOZED_UNTIL_KEY = "backup.snoozedUntil";

export type ReminderState = { lastBackupAt: number | null; snoozedUntil: number };

export function shouldRemind(state: ReminderState, credentialCount: number, now: number): boolean {
  if (credentialCount === 0 || now < state.snoozedUntil) return false;
  return state.lastBackupAt === null || now - state.lastBackupAt > REMIND_AFTER_MS;
}

function readNumber(key: string): number | null {
  const value = Number(Storage.getItemSync(key));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function readReminderState(): ReminderState {
  return {
    lastBackupAt: readNumber(LAST_BACKUP_KEY),
    snoozedUntil: readNumber(SNOOZED_UNTIL_KEY) ?? 0,
  };
}

export function recordBackup(now = Date.now()) {
  Storage.setItemSync(LAST_BACKUP_KEY, String(now));
}

export function snoozeReminder(now = Date.now()) {
  Storage.setItemSync(SNOOZED_UNTIL_KEY, String(now + SNOOZE_MS));
}
