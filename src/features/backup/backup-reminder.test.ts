import { REMIND_AFTER_MS, shouldRemind } from "./backup-reminder";

const now = 1_000_000_000_000;

describe("shouldRemind", () => {
  it("reminds when there has never been a backup", () => {
    expect(shouldRemind({ lastBackupAt: null, snoozedUntil: 0 }, 3, now)).toBe(true);
  });

  it("stays quiet with an empty vault", () => {
    expect(shouldRemind({ lastBackupAt: null, snoozedUntil: 0 }, 0, now)).toBe(false);
  });

  it("stays quiet after a recent backup", () => {
    expect(shouldRemind({ lastBackupAt: now - 1000, snoozedUntil: 0 }, 3, now)).toBe(false);
  });

  it("reminds once the last backup is too old", () => {
    expect(
      shouldRemind({ lastBackupAt: now - REMIND_AFTER_MS - 1, snoozedUntil: 0 }, 3, now),
    ).toBe(true);
  });

  it("stays quiet while snoozed, then reminds again", () => {
    const state = { lastBackupAt: null, snoozedUntil: now + 1000 };
    expect(shouldRemind(state, 3, now)).toBe(false);
    expect(shouldRemind(state, 3, now + 1000)).toBe(true);
  });
});
