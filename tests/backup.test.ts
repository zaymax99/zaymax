import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseBackupContents,
  restoreBackup,
  type ZaymaxBackup,
} from "../lib/backup";
import { HEALTHKIT_CONNECTED_KEY } from "../lib/steps";

const storage = vi.hoisted(() => ({
  getAllKeys: vi.fn(),
  multiGet: vi.fn(),
  multiRemove: vi.fn(),
  multiSet: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage,
}));
vi.mock("expo-document-picker", () => ({ getDocumentAsync: vi.fn() }));
vi.mock("expo-file-system/legacy", () => ({}));
vi.mock("expo-sharing", () => ({}));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

function backup(data: Record<string, string>): ZaymaxBackup {
  return {
    app: "Zaymax",
    version: 1,
    exportedAt: "2026-08-27T10:00:00.000Z",
    data,
  };
}

describe("backup restoration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.getAllKeys.mockResolvedValue([]);
    storage.multiGet.mockResolvedValue([]);
    storage.multiRemove.mockResolvedValue(undefined);
    storage.multiSet.mockResolvedValue(undefined);
  });

  it("does not restore a stale Apple Health connection flag", async () => {
    await restoreBackup(
      backup({
        "zaymax.workouts.builder.v1": "[]",
        [HEALTHKIT_CONNECTED_KEY]: "1",
      }),
    );

    expect(storage.multiSet).toHaveBeenCalledWith([
      ["zaymax.workouts.builder.v1", "[]"],
    ]);
  });

  it("does not restore a device-only Lock Screen notification identifier", async () => {
    await restoreBackup(
      backup({
        "zaymax.reminders.v1": JSON.stringify([
          {
            id: "note-1",
            text: "Gym-Tasche mitnehmen",
            lockScreenPinned: true,
            lockScreenNotificationId: "old-device-notification",
          },
        ]),
      }),
    );

    expect(storage.multiSet).toHaveBeenCalledWith([
      [
        "zaymax.reminders.v1",
        JSON.stringify([
          {
            id: "note-1",
            text: "Gym-Tasche mitnehmen",
            lockScreenPinned: true,
          },
        ]),
      ],
    ]);
  });

  it("rolls back the previous local data when writing the backup fails", async () => {
    storage.getAllKeys.mockResolvedValue(["zaymax.workouts.builder.v1"]);
    storage.multiGet.mockResolvedValue([
      ["zaymax.workouts.builder.v1", "old-data"],
    ]);
    storage.multiSet
      .mockRejectedValueOnce(new Error("storage-full"))
      .mockResolvedValueOnce(undefined);

    await expect(
      restoreBackup(
        backup({ "zaymax.workouts.builder.v1": "replacement-data" }),
      ),
    ).rejects.toThrow("storage-full");

    expect(storage.multiSet).toHaveBeenLastCalledWith([
      ["zaymax.workouts.builder.v1", "old-data"],
    ]);
  });

  it("rejects backups whose data payload is not a plain object", () => {
    expect(() =>
      parseBackupContents(
        JSON.stringify({
          app: "Zaymax",
          version: 1,
          exportedAt: "2026-08-27T10:00:00.000Z",
          data: [],
        }),
      ),
    ).toThrow("invalid-backup");
  });

  it("accepts a valid local-data backup", () => {
    expect(
      parseBackupContents(
        JSON.stringify({
          app: "Zaymax",
          version: 1,
          exportedAt: "2026-08-27T10:00:00.000Z",
          data: { "zaymax.settings.v1": '{"restSeconds":90}' },
        }),
      ).data,
    ).toEqual({ "zaymax.settings.v1": '{"restSeconds":90}' });
  });
});
