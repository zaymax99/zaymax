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

    expect(storage.multiRemove).toHaveBeenCalledWith([
      "zaymax.workouts.builder.v1",
      "zaymax.workout-history.v1",
      "zaymax.active-session.v1",
    ]);
    expect(storage.multiSet).toHaveBeenLastCalledWith([
      ["zaymax.workouts.builder.v1", "old-workouts"],
      ["zaymax.workout-history.v1", "old-history"],
      ["zaymax.active-session.v1", "active-session"],
    ]);
  });
});
