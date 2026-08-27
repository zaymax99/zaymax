import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getPinnedLockScreenReminder,
  loadReminders,
  selectLockScreenReminder,
  stripLockScreenStateFromRemindersValue,
  type Reminder,
} from "../lib/reminders";

const storage = vi.hoisted(() => ({
  getItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage,
}));

describe("journal storage recovery", () => {
  beforeEach(() => {
    storage.getItem.mockReset();
  });

  it("keeps valid notes and ignores malformed entries", async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify([
        {
          id: "note-1",
          text: "Nächstes Training ruhig angehen",
          createdAt: "2026-08-27T12:00:00.000Z",
          updatedAt: "2026-08-27T12:00:00.000Z",
        },
        {
          id: "note-1",
          text: "Duplicate",
          createdAt: "2026-08-27T13:00:00.000Z",
          updatedAt: "2026-08-27T13:00:00.000Z",
        },
        { id: "broken", text: 42 },
        null,
      ]),
    );

    await expect(loadReminders()).resolves.toEqual([
      {
        id: "note-1",
        text: "Nächstes Training ruhig angehen",
        createdAt: "2026-08-27T12:00:00.000Z",
        updatedAt: "2026-08-27T12:00:00.000Z",
      },
    ]);
  });

  it("returns an empty journal for invalid JSON", async () => {
    storage.getItem.mockResolvedValue("{invalid-json");

    await expect(loadReminders()).resolves.toEqual([]);
  });

  it("keeps an active local Lock Screen identifier on the device", async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify([
        {
          id: "note-1",
          text: "Gym-Tasche mitnehmen",
          createdAt: "2026-08-27T12:00:00.000Z",
          updatedAt: "2026-08-27T12:00:00.000Z",
          lockScreenNotificationId: "local-notification-1",
        },
      ]),
    );

    await expect(loadReminders()).resolves.toMatchObject([
      { lockScreenNotificationId: "local-notification-1" },
    ]);
  });

  it("removes device-only Lock Screen state from backup values", () => {
    expect(
      JSON.parse(
        stripLockScreenStateFromRemindersValue(
          JSON.stringify([
            {
              id: "note-1",
              text: "Gym-Tasche mitnehmen",
              lockScreenNotificationId: "local-notification-1",
            },
          ]),
        ),
      ),
    ).toEqual([{ id: "note-1", text: "Gym-Tasche mitnehmen" }]);
  });

  it("allows exactly one note to be selected for the Lock Screen widget", () => {
    const notes: Reminder[] = [
      {
        id: "note-1",
        text: "Gym-Tasche mitnehmen",
        createdAt: "2026-08-27T12:00:00.000Z",
        updatedAt: "2026-08-27T12:00:00.000Z",
        lockScreenPinned: true,
      },
      {
        id: "note-2",
        text: "Langsam steigern",
        createdAt: "2026-08-27T13:00:00.000Z",
        updatedAt: "2026-08-27T13:00:00.000Z",
      },
    ];

    const selected = selectLockScreenReminder(notes, "note-2");
    expect(selected.filter((note) => note.lockScreenPinned)).toHaveLength(1);
    expect(getPinnedLockScreenReminder(selected)?.id).toBe("note-2");
    expect(
      getPinnedLockScreenReminder(selectLockScreenReminder(notes, null)),
    ).toBeUndefined();
  });

  it("keeps the portable widget selection but removes legacy notification ids", () => {
    expect(
      JSON.parse(
        stripLockScreenStateFromRemindersValue(
          JSON.stringify([
            {
              id: "note-1",
              text: "Gym-Tasche mitnehmen",
              lockScreenPinned: true,
              lockScreenNotificationId: "old-device-notification",
            },
          ]),
        ),
      ),
    ).toEqual([
      { id: "note-1", text: "Gym-Tasche mitnehmen", lockScreenPinned: true },
    ]);
  });
});
