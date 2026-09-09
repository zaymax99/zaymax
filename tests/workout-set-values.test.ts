import { describe, expect, it, vi } from "vitest";

import {
  completedValuesForTemplate,
  displayWeight,
  exerciseSummary,
  gainsForSet,
  restoreExerciseSetValues,
  resizeRepsPerSet,
  resizeWeightsPerSet,
  setValuesForExercise,
  toKg,
  weightGainInKg,
  weightForSet,
  type Exercise,
} from "../lib/workouts";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

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
    expect(
      resizeWeightsPerSet({ weightKg: 60, weightsPerSetKg: [] }, 3),
    ).toEqual([60, 60, 60]);
  });

  it("summarizes varying set values", () => {
    expect(exerciseSummary(exercise, "kg")).toBe(
      "3 Sätze · 12/10/8 Wdh. · 40/50/45 kg",
    );
  });

  it("preserves and displays two weight decimal places", () => {
    const preciseExercise = {
      ...exercise,
      weightKg: 20.25,
      weightsPerSetKg: [20.25, 30.15, 31.17],
    };

    expect(resizeWeightsPerSet(preciseExercise, 3)).toEqual([
      20.25, 30.15, 31.17,
    ]);
    expect(exerciseSummary(preciseExercise, "kg")).toContain(
      "20.25/30.15/31.17 kg",
    );
    expect(displayWeight(31.17, "kg")).toBe("31.17 kg");
    expect(displayWeight(0, "kg")).toBe("0 kg");
  });

  it("creates editable active values from every configured set", () => {
    expect(setValuesForExercise(exercise)).toEqual([
      { reps: 12, weightKg: 40 },
      { reps: 10, weightKg: 50 },
      { reps: 8, weightKg: 45 },
    ]);
  });

  it("resumes removed or added sets without restoring the template count", () => {
    const reduced = [{ reps: 13, weightKg: 42 }];
    expect(restoreExerciseSetValues(exercise, reduced)).toEqual(reduced);
    const expanded = [
      ...setValuesForExercise(exercise),
      { reps: 6, weightKg: 48 },
    ];
    expect(restoreExerciseSetValues(exercise, expanded)).toEqual(expanded);
    expect(restoreExerciseSetValues(exercise)).toEqual(
      setValuesForExercise(exercise),
    );
    expect(restoreExerciseSetValues(exercise, [])).toEqual(
      setValuesForExercise(exercise),
    );
    const restored = restoreExerciseSetValues(exercise, reduced);
    restored[0].reps = 1;
    expect(reduced[0].reps).toBe(13);
  });

  it("tracks repetition and weight progress independently", () => {
    expect(
      gainsForSet({ reps: 11, weightKg: 51 }, { reps: 10, weightKg: 50 }),
    ).toEqual({ repsGain: 1, weightGainKg: 1 });
    expect(
      gainsForSet({ reps: 9, weightKg: 52 }, { reps: 10, weightKg: 50 }),
    ).toEqual({ repsGain: 0, weightGainKg: 2 });
  });

  it("does not award progress or a weight record for unchanged displayed pounds", () => {
    const baselineKg = 30.15;
    const displayedLbs = Number(displayWeight(baselineKg, "lbs").split(" ")[0]);
    const enteredKg = toKg(displayedLbs, "lbs");
    expect(enteredKg).toBeGreaterThan(baselineKg);
    expect(weightGainInKg(enteredKg, baselineKg, "lbs")).toBe(0);
    expect(
      gainsForSet(
        { reps: 10, weightKg: enteredKg },
        { reps: 10, weightKg: baselineKg },
        "lbs",
      ),
    ).toEqual({ repsGain: 0, weightGainKg: 0 });
  });

  it("does not award progress when re-entering rounded kilograms", () => {
    const baselineKg = toKg(44.09, "lbs");
    const enteredKg = Number(displayWeight(baselineKg, "kg").split(" ")[0]);
    expect(enteredKg).toBeGreaterThan(baselineKg);
    expect(weightGainInKg(enteredKg, baselineKg, "kg")).toBe(0);
  });

  it("still records real one-hundredth increases in either unit", () => {
    expect(weightGainInKg(30.16, 30.15, "kg")).toBe(0.01);
    expect(weightGainInKg(toKg(66.48, "lbs"), 30.15, "lbs")).toBeCloseTo(
      toKg(0.01, "lbs"),
      10,
    );
    expect(weightGainInKg(30.14, 30.15, "kg")).toBe(0);
  });

  it("only promotes completed active values into the next template", () => {
    expect(
      completedValuesForTemplate(
        exercise,
        [
          { reps: 13, weightKg: 42 },
          { reps: 11, weightKg: 52 },
          { reps: 9, weightKg: 47 },
        ],
        [true, false, true],
      ),
    ).toEqual([
      { reps: 13, weightKg: 42 },
      { reps: 10, weightKg: 50 },
      { reps: 9, weightKg: 47 },
    ]);
  });

  it("discards uncompleted additional tail sets instead of storing their draft values", () => {
    const configured = setValuesForExercise(exercise);
    expect(
      completedValuesForTemplate(
        exercise,
        [...configured, { reps: 99, weightKg: 500 }],
        [true, true, true, false],
      ),
    ).toEqual(configured);
  });

  it("keeps later completed extra sets without promoting unchecked gaps", () => {
    const configured = setValuesForExercise(exercise);
    expect(
      completedValuesForTemplate(
        exercise,
        [...configured, { reps: 99, weightKg: 500 }, { reps: 6, weightKg: 47 }],
        [true, true, true, false, true],
      ),
    ).toEqual([
      ...configured,
      { reps: 8, weightKg: 45 },
      { reps: 6, weightKg: 47 },
    ]);
  });

  it("retains an intentional reduction in the active set count", () => {
    expect(
      completedValuesForTemplate(
        exercise,
        [{ reps: 13, weightKg: 42 }],
        [true],
      ),
    ).toEqual([{ reps: 13, weightKg: 42 }]);
  });
});
