import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  dismissLockScreenReminder,
  getPresentedLockScreenReminderIds,
  scheduleLockScreenReminder,
} from "../lib/lock-screen-reminders";

const notifications = vi.hoisted(() => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  dismissNotificationAsync: vi.fn(),
  getPresentedNotificationsAsync: vi.fn(),
  setNotificationHandler: vi.fn(),
}));

vi.mock("expo-notifications", () => ({
  ...notifications,
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
}));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

describe("local Lock Screen journal reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      ios: { status: 2 },
    });
    notifications.scheduleNotificationAsync.mockResolvedValue("notification-1");
    notifications.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
    notifications.dismissNotificationAsync.mockResolvedValue(undefined);
    notifications.getPresentedNotificationsAsync.mockResolvedValue([]);
  });

  it("creates a silent local notification containing the selected note", async () => {
    await expect(
      scheduleLockScreenReminder("note-1", "Gym-Tasche mitnehmen", {
        title: "ZAYMAX · NOTIZ",
        subtitle: "Aus deinem Tagebuch",
      }),
    ).resolves.toEqual({
      status: "scheduled",
      identifier: "notification-1",
    });

    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: expect.objectContaining({
        title: "ZAYMAX · NOTIZ",
        subtitle: "Aus deinem Tagebuch",
        body: "Gym-Tasche mitnehmen",
        data: { type: "journal-note", reminderId: "note-1" },
        sound: false,
      }),
      trigger: null,
    });
  });

  it("does not schedule anything when notification permission is denied", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
      ios: { status: 1 },
    });

    await expect(
      scheduleLockScreenReminder("note-1", "Text", {
        title: "ZAYMAX · NOTIZ",
        subtitle: "Aus deinem Tagebuch",
      }),
    ).resolves.toEqual({ status: "denied" });
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("removes a reminder from both the schedule and Notification Center", async () => {
    await dismissLockScreenReminder("notification-1");

    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "notification-1",
    );
    expect(notifications.dismissNotificationAsync).toHaveBeenCalledWith(
      "notification-1",
    );
  });

  it("recognizes only presented Zaymax journal reminders", async () => {
    notifications.getPresentedNotificationsAsync.mockResolvedValue([
      {
        request: {
          identifier: "notification-1",
          content: { data: { type: "journal-note" } },
        },
      },
      {
        request: {
          identifier: "other-notification",
          content: { data: { type: "other" } },
        },
      },
    ]);

    await expect(getPresentedLockScreenReminderIds()).resolves.toEqual(
      new Set(["notification-1"]),
    );
  });
});
