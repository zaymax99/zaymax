import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatDateTime,
  loadActiveSession,
  loadWorkoutHistory,
  loadWorkouts,
} from "../lib/workouts";

const storage = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage,
}));

describe("workout storage recovery", () => {
  beforeEach(() => {
    storage.getItem.mockReset();
  });

  it("keeps valid workouts when another stored entry is broken", async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify([
        {
          id: "push",
          title: "Push",
          exercises: [
            {
              id: "bench",
              name: "Brustpresse",
              sets: 3,
              reps: 10,
            },
          ],
          createdAt: "2026-08-26T18:00:00.000Z",
          updatedAt: "2026-08-26T18:00:00.000Z",
        },
        {
          id: "push",
          title: "Duplicate",
          exercises: [
            {
              id: "duplicate-exercise",
              name: "Should be ignored",
              sets: 1,
              reps: 1,
            },
          ],
          createdAt: "2026-08-26T17:00:00.000Z",
          updatedAt: "2026-08-26T17:00:00.000Z",
        },
        { id: "broken", title: "Broken", exercises: null },
      ]),
    );

    const workouts = await loadWorkouts();

    expect(workouts).toHaveLength(1);
    expect(workouts[0].id).toBe("push");
    expect(workouts[0].title).toBe("Push");
    expect(workouts[0].exercises[0].repsPerSet).toEqual([10, 10, 10]);
    expect(workouts[0].exercises[0].weightsPerSetKg).toEqual([
      null,
      null,
      null,
    ]);
  });

  it("ignores a damaged active session instead of throwing", async () => {
    storage.getItem.mockResolvedValue("{not-json");

    await expect(loadActiveSession()).resolves.toBeNull();
  });

  it("sanitizes recoverable active-session values", async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({
        workoutId: "push",
        startedAt: "2026-08-26T18:00:00.000Z",
        completedSets: { bench: [true, "false"] },
        setValues: {
          bench: [
            { reps: 10, weightKg: 22.5 },
            { reps: "invalid", weightKg: 25 },
          ],
        },
        baselineSetValues: {},
        restSeconds: 9999,
        restRemaining: -3,
      }),
    );

    const session = await loadActiveSession();

    expect(session?.completedSets.bench).toEqual([true, false]);
    expect(session?.setValues.bench).toEqual([{ reps: 10, weightKg: 22.5 }]);
    expect(session?.restSeconds).toBe(600);
    expect(session?.restRemaining).toBe(0);
  });

  it("keeps valid history entries and safely formats bad dates", async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify([
        {
          id: "history-1",
          workoutId: "push",
          workoutTitle: "Push",
          completedAt: "2026-08-26T19:00:00.000Z",
          exercises: [],
        },
        { id: "broken" },
      ]),
    );

    await expect(loadWorkoutHistory()).resolves.toHaveLength(1);
    expect(formatDateTime("not-a-date")).toBe("—");
  });
});
