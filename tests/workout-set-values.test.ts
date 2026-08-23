import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import { completedValuesForTemplate, exerciseSummary, gainsForSet, resizeRepsPerSet, resizeWeightsPerSet, setValuesForExercise, weightForSet, type Exercise } from "../lib/workouts";

const exercise: Exercise = {
  id: "bench-press",
  name: "Bankdrücken",
  sets: 3,
  reps: 12,
  repsPerSet: [12, 10, 8],
  weightKg: 40,
  weightsPerSetKg: [40, 50, 45],
};

describe("workout set values", () => {
  it("keeps individual repetitions and weights for every set", () => {
    expect(resizeRepsPerSet(exercise, 3)).toEqual([12, 10, 8]);
    expect(resizeWeightsPerSet(exercise, 3)).toEqual([40, 50, 45]);
    expect(weightForSet(exercise, 1)).toBe(50);
  });

  it("migrates a legacy shared weight to every set", () => {
    expect(resizeWeightsPerSet({ weightKg: 60, weightsPerSetKg: [] }, 3)).toEqual([60, 60, 60]);
  });

  it("summarizes varying set values", () => {
    expect(exerciseSummary(exercise, "kg")).toBe("3 Sätze · 12/10/8 Wdh. · 40/50/45 kg");
  });

  it("creates editable active values from every configured set", () => {
    expect(setValuesForExercise(exercise)).toEqual([
      { reps: 12, weightKg: 40 },
      { reps: 10, weightKg: 50 },
      { reps: 8, weightKg: 45 },
    ]);
  });

  it("tracks repetition and weight progress independently", () => {
    expect(gainsForSet({ reps: 11, weightKg: 51 }, { reps: 10, weightKg: 50 })).toEqual({ repsGain: 1, weightGainKg: 1 });
    expect(gainsForSet({ reps: 9, weightKg: 52 }, { reps: 10, weightKg: 50 })).toEqual({ repsGain: 0, weightGainKg: 2 });
  });

  it("only promotes completed active values into the next template", () => {
    expect(completedValuesForTemplate(exercise, [
      { reps: 13, weightKg: 42 },
      { reps: 11, weightKg: 52 },
      { reps: 9, weightKg: 47 },
    ], [true, false, true])).toEqual([
      { reps: 13, weightKg: 42 },
      { reps: 10, weightKg: 50 },
      { reps: 9, weightKg: 47 },
    ]);
  });
});
