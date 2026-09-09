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
      restoreBackup(backup({ "zaymax.workouts.builder.v1": "[]" })),
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

  it.each([
    ["zaymax.workouts.builder.v1", "not-json"],
    ["zaymax.workouts.builder.v1", "{}"],
    [
      "zaymax.workouts.builder.v1",
      '[{"id":"a","title":"Plan","exercises":[null]}]',
    ],
    [
      "zaymax.workouts.builder.v1",
      '[{"id":"a","title":"Plan","exercises":[{"id":"e","name":"Press","sets":"3"}]}]',
    ],
    ["zaymax.workout-history.v1", '[{"id":"a"}]'],
    ["zaymax.reminders.v1", '[{"id":"a","text":9}]'],
    ["zaymax.settings.v1", '{"restSeconds":-10}'],
    ["zaymax.profile.v1", '{"birthDate":"1999-02-31"}'],
    ["zaymax.profile.v1", '{"birthDate":"1800-01-01"}'],
    ["zaymax.profile.v1", '{"birthDate":"2999-01-01"}'],
    ["zaymax.active-session.v1", '{"workoutId":"a","startedAt":"yesterday"}'],
    ["zaymax.language.v1", "es"],
    ["zaymax.training-days.v1", '["unknown"]'],
    ["zaymax.unknown.v99", "[]"],
  ])(
    "rejects invalid inner payload for %s before any storage operation",
    async (key, value) => {
      const invalid = backup({ [key]: value });
      expect(() => parseBackupContents(JSON.stringify(invalid))).toThrow(
        "invalid-backup",
      );
      await expect(restoreBackup(invalid)).rejects.toThrow("invalid-backup");
      expect(storage.getAllKeys).not.toHaveBeenCalled();
      expect(storage.multiSet).not.toHaveBeenCalled();
      expect(storage.multiRemove).not.toHaveBeenCalled();
    },
  );

  it("preserves supported legacy payloads without requiring newly added fields", () => {
    const data = {
      "zaymax.workouts.builder.v1": JSON.stringify([
        {
          id: "a",
          title: "Plan",
          exercises: [
            { id: "e", name: "Press", sets: 3, reps: 10, weightKg: 20.25 },
          ],
        },
      ]),
      "zaymax.workout-history.v1": JSON.stringify([
        {
          id: "h",
          workoutId: "a",
          workoutTitle: "Plan",
          completedAt: "2026-08-27T10:00:00Z",
          exercises: [
            {
              exerciseId: "e",
              name: "Press",
              sets: [{ setNumber: 1, reps: 10, weightKg: 20.25 }],
            },
          ],
        },
      ]),
      "zaymax.profile.v1": '{"onboardingCompleted":true}',
      "zaymax.language.v1": "pl",
      "zaymax.reminders.v1":
        '[{"id":"old-note","text":"Training","createdAt":"","updatedAt":""}]',
      "zaymax.birthday-celebration.v1": "2026-1999-07-10",
    };
    expect(parseBackupContents(JSON.stringify(backup(data))).data).toEqual(
      data,
    );
  });

  it("writes replacement data before deleting obsolete keys", async () => {
    storage.getAllKeys.mockResolvedValue([
      "zaymax.workouts.builder.v1",
      "zaymax.language.v1",
    ]);
    storage.multiGet.mockResolvedValue([
      ["zaymax.workouts.builder.v1", "[]"],
      ["zaymax.language.v1", "de"],
    ]);
    await restoreBackup(backup({ "zaymax.workouts.builder.v1": "[]" }));
    expect(storage.multiRemove).toHaveBeenCalledTimes(1);
    expect(storage.multiRemove).toHaveBeenCalledWith(["zaymax.language.v1"]);
    expect(storage.multiSet.mock.invocationCallOrder[0]).toBeLessThan(
      storage.multiRemove.mock.invocationCallOrder[0],
    );
  });

  it("does not delete original data when replacement and rollback writes both fail", async () => {
    const original = new Map([
      ["zaymax.workouts.builder.v1", "original-workouts"],
      ["zaymax.workout-history.v1", "original-history"],
    ]);
    storage.getAllKeys.mockResolvedValue([...original.keys()]);
    storage.multiGet.mockResolvedValue([...original.entries()]);
    storage.multiSet.mockRejectedValue(new Error("storage-full"));
    storage.multiRemove.mockImplementation(async (keys: string[]) => {
      keys.forEach((key) => original.delete(key));
    });
    await expect(
      restoreBackup(backup({ "zaymax.workouts.builder.v1": "[]" })),
    ).rejects.toThrow("storage-full");
    expect([...original.values()]).toEqual([
      "original-workouts",
      "original-history",
    ]);
    expect(storage.multiRemove).not.toHaveBeenCalled();
  });

  it("restores old values in place if removing obsolete keys fails", async () => {
    storage.getAllKeys.mockResolvedValue([
      "zaymax.workouts.builder.v1",
      "zaymax.language.v1",
    ]);
    storage.multiGet.mockResolvedValue([
      ["zaymax.workouts.builder.v1", "old-data"],
      ["zaymax.language.v1", "de"],
    ]);
    storage.multiRemove.mockRejectedValueOnce(new Error("remove-failed"));
    await expect(
      restoreBackup(backup({ "zaymax.workouts.builder.v1": "[]" })),
    ).rejects.toThrow("remove-failed");
    expect(storage.multiSet).toHaveBeenLastCalledWith([
      ["zaymax.workouts.builder.v1", "old-data"],
      ["zaymax.language.v1", "de"],
    ]);
    expect(storage.multiRemove).toHaveBeenCalledTimes(1);
  });

  it("restores a partial write and removes only keys introduced by the failed import", async () => {
    const originalEntries = [
      ["zaymax.workouts.builder.v1", "original-workouts"],
      ["zaymax.workout-history.v1", "original-history"],
    ] as [string, string][];
    const data = new Map(originalEntries);
    storage.getAllKeys.mockImplementation(async () => [...data.keys()]);
    storage.multiGet.mockImplementation(async (keys: string[]) =>
      keys.map((key) => [key, data.get(key) ?? null]),
    );
    storage.multiRemove.mockImplementation(async (keys: string[]) => {
      keys.forEach((key) => data.delete(key));
    });
    let writes = 0;
    storage.multiSet.mockImplementation(async (entries: [string, string][]) => {
      writes += 1;
      entries.forEach(([key, value]) => data.set(key, value));
      if (writes === 1) throw new Error("partial-write");
    });
    await expect(
      restoreBackup(
        backup({
          "zaymax.language.v1": "en",
          "zaymax.workouts.builder.v1": "[]",
        }),
      ),
    ).rejects.toThrow("partial-write");
    expect([...data.entries()]).toEqual(originalEntries);
    expect(storage.multiRemove).toHaveBeenCalledWith(["zaymax.language.v1"]);
  });

  it("accepts finite numeric values emitted by old uncapped editors", () => {
    const data = {
      "zaymax.workouts.builder.v1": JSON.stringify([
        {
          id: "a",
          title: "Legacy",
          exercises: [
            { id: "e", name: "Press", sets: 3, reps: 1000, weightKg: 5001 },
          ],
        },
      ]),
    };
    expect(parseBackupContents(JSON.stringify(backup(data))).data).toEqual(
      data,
    );
  });
});
