import { describe, expect, it } from "vitest";
import {
  formatHistoryVolume,
  withHistorySummary,
} from "../lib/workout-history";
import type { WorkoutHistoryEntry } from "../lib/workouts";

const legacy: WorkoutHistoryEntry = {
  id: "h",
  workoutId: "w",
  workoutTitle: "Plan",
  completedAt: "2026-08-28T12:00:00Z",
  exercises: [
    {
      exerciseId: "e",
      name: "Press",
      sets: [
        { setNumber: 1, reps: 10, weightKg: 20.25, repsGain: 1 },
        {
          setNumber: 2,
          reps: 8,
          weightKg: 30.15,
          repsPersonalBest: true,
          weightPersonalBest: true,
        },
        { setNumber: 3, reps: 12 },
      ],
    },
  ],
};

describe("legacy history summaries", () => {
  it("derives totals from recorded sets without changing saved history", () => {
    const result = withHistorySummary(legacy);
    expect(result.totalVolumeKg).toBe(443.7);
    expect(result.completedSetCount).toBe(3);
    expect(result.improvementCount).toBe(1);
    expect(result.personalBestCount).toBe(2);
    expect(legacy.totalVolumeKg).toBeUndefined();
  });
  it("keeps explicit summaries including zero", () => {
    const result = withHistorySummary({
      ...legacy,
      totalVolumeKg: 0,
      completedSetCount: 0,
      improvementCount: 0,
      personalBestCount: 0,
    });
    expect(result.totalVolumeKg).toBe(0);
    expect(result.completedSetCount).toBe(0);
    expect(result.improvementCount).toBe(0);
    expect(result.personalBestCount).toBe(0);
  });
  it("does not count skipped exercises", () => {
    const result = withHistorySummary({
      ...legacy,
      exercises: legacy.exercises.map((e) => ({ ...e, skipped: true })),
    });
    expect(result.totalVolumeKg).toBe(0);
    expect(result.completedSetCount).toBe(0);
  });
  it.each([
    ["de-DE", "11.353,25"],
    ["en-US", "11,353.25"],
    ["pl-PL", "11 353,25"],
  ])("formats full volume for %s", (locale, expected) => {
    expect(formatHistoryVolume(11353.25, locale)).toBe(expected);
  });
});
