import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  finalizeWorkoutStorage,
  type Workout,
  type WorkoutHistoryEntry,
} from "../lib/workouts";

const storage = vi.hoisted(() => ({
  multiGet: vi.fn(),
  multiSet: vi.fn(),
  multiRemove: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage,
}));

const workouts: Workout[] = [
  {
    id: "push",
    title: "Push",
    exercises: [
      {
        id: "bench",
        name: "Brustpresse",
        sets: 1,
        reps: 10,
        repsPerSet: [10],
        weightsPerSetKg: [20],
      },
    ],
    createdAt: "2026-08-27T10:00:00.000Z",
    updatedAt: "2026-08-27T11:00:00.000Z",
  },
];

const history: WorkoutHistoryEntry[] = [
  {
    id: "history-1",
    workoutId: "push",
    workoutTitle: "Push",
    completedAt: "2026-08-27T11:00:00.000Z",
    exercises: [],
  },
];

describe("workout finalization storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.multiGet.mockResolvedValue([
      ["zaymax.workouts.builder.v1", "old-workouts"],
      ["zaymax.workout-history.v1", "old-history"],
      ["zaymax.active-session.v1", "active-session"],
    ]);
    storage.multiSet.mockResolvedValue(undefined);
    storage.multiRemove.mockResolvedValue(undefined);
    storage.removeItem.mockResolvedValue(undefined);
  });

  it("writes workout and history before clearing the active session", async () => {
    await finalizeWorkoutStorage(workouts, history);

    expect(storage.multiSet).toHaveBeenCalledWith([
      ["zaymax.workouts.builder.v1", JSON.stringify(workouts)],
      ["zaymax.workout-history.v1", JSON.stringify(history)],
    ]);
    expect(storage.removeItem).toHaveBeenCalledWith("zaymax.active-session.v1");
  });

  it("restores all previous values when finalization fails", async () => {
    storage.removeItem.mockRejectedValueOnce(new Error("storage-failed"));

    await expect(finalizeWorkoutStorage(workouts, history)).rejects.toThrow(
      "storage-failed",
    );

    expect(storage.multiRemove).not.toHaveBeenCalled();
    expect(storage.multiSet).toHaveBeenLastCalledWith([
      ["zaymax.workouts.builder.v1", "old-workouts"],
      ["zaymax.workout-history.v1", "old-history"],
      ["zaymax.active-session.v1", "active-session"],
    ]);
  });

  it("does not erase existing data when both writing and rollback fail", async () => {
    const saved = new Map([
      ["zaymax.workouts.builder.v1", "old-workouts"],
      ["zaymax.workout-history.v1", "old-history"],
      ["zaymax.active-session.v1", "active-session"],
    ]);
    const original = new Map(saved);
    storage.multiGet.mockImplementation(async (keys: string[]) =>
      keys.map((key) => [key, saved.get(key) ?? null]),
    );
    storage.multiSet.mockRejectedValue(new Error("persistent-write-failure"));
    storage.multiRemove.mockImplementation(async (keys: string[]) => {
      keys.forEach((key) => saved.delete(key));
    });

    await expect(finalizeWorkoutStorage(workouts, history)).rejects.toThrow(
      "persistent-write-failure",
    );

    expect(saved).toEqual(original);
    expect(storage.multiRemove).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("removes only keys absent before the failed operation after restoring existing data", async () => {
    storage.multiGet.mockResolvedValue([
      ["zaymax.workouts.builder.v1", "old-workouts"],
      ["zaymax.workout-history.v1", null],
      ["zaymax.active-session.v1", "active-session"],
    ]);
    storage.removeItem.mockRejectedValueOnce(new Error("session-clear-failed"));

    await expect(finalizeWorkoutStorage(workouts, history)).rejects.toThrow(
      "session-clear-failed",
    );

    expect(storage.multiSet).toHaveBeenLastCalledWith([
      ["zaymax.workouts.builder.v1", "old-workouts"],
      ["zaymax.active-session.v1", "active-session"],
    ]);
    expect(storage.multiRemove).toHaveBeenCalledTimes(1);
    expect(storage.multiRemove).toHaveBeenCalledWith([
      "zaymax.workout-history.v1",
    ]);
    expect(storage.multiRemove.mock.invocationCallOrder[0]).toBeGreaterThan(
      storage.multiSet.mock.invocationCallOrder.at(-1)!,
    );
  });
});
