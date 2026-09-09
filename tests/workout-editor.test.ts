import { describe, expect, it, vi } from "vitest";
import {
  applySetCountDraft,
  normalizeEditorReps,
  normalizeEditorWeightKg,
  normalizeExerciseForSave,
} from "../lib/workout-editor";
import { toKg, type Exercise } from "../lib/workouts";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));

const exercise: Exercise = {
  id: "bench",
  name: "Bankdrücken",
  sets: 3,
  reps: 12,
  repsPerSet: [12, 10, 8],
  weightKg: 20.25,
  weightsPerSetKg: [20.25, 30.15, 31.17],
};

describe("set count editing", () => {
  it("keeps every existing value when the field is cleared or untouched", () => {
    expect(applySetCountDraft(exercise, "")).toBe(exercise);
    expect(applySetCountDraft(exercise)).toBe(exercise);
    expect(applySetCountDraft(exercise, "3")).toBe(exercise);
  });

  it("applies the final multi-digit draft without truncating original set values", () => {
    const result = applySetCountDraft(exercise, "12");
    expect(result.sets).toBe(12);
    expect(result.repsPerSet).toHaveLength(12);
    expect(result.weightsPerSetKg).toHaveLength(12);
    expect(result.repsPerSet.slice(0, 3)).toEqual([12, 10, 8]);
    expect(result.weightsPerSetKg.slice(0, 3)).toEqual([20.25, 30.15, 31.17]);
    expect(exercise.sets).toBe(3);
    expect(exercise.repsPerSet).toEqual([12, 10, 8]);
  });

  it("reduces the count only when a smaller draft is committed", () => {
    const result = applySetCountDraft(exercise, "2");
    expect(result.sets).toBe(2);
    expect(result.repsPerSet).toEqual([12, 10]);
    expect(result.weightsPerSetKg).toEqual([20.25, 30.15]);
  });

  it.each([
    ["0", 1],
    ["99", 20],
    ["04", 4],
  ] as const)("normalizes %s to %i sets on commit", (draft, expected) => {
    expect(applySetCountDraft(exercise, draft).sets).toBe(expected);
  });

  it("is safe to apply again when save follows blur", () => {
    const committed = applySetCountDraft(exercise, "5");
    expect(applySetCountDraft(committed, "5")).toBe(committed);
    expect(applySetCountDraft(exercise, "5")).toEqual(committed);
  });

  it("does not propagate invalid draft text into stored exercise data", () => {
    expect(applySetCountDraft(exercise, "abc")).toBe(exercise);
  });
});

describe("workout editor value limits", () => {
  it("allows clearing repetitions and caps pasted large values at the stored limit", () => {
    expect(normalizeEditorReps(0)).toBe(0);
    expect(normalizeEditorReps(12)).toBe(12);
    expect(normalizeEditorReps(1000)).toBe(999);
    expect(normalizeEditorReps(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("applies the 5000 kg ceiling after converting pounds", () => {
    expect(normalizeEditorWeightKg(99999, "kg")).toBe(5000);
    expect(normalizeEditorWeightKg(99999, "lbs")).toBe(5000);
    expect(normalizeEditorWeightKg(11023.1, "lbs")).toBeCloseTo(5000, 8);
    expect(normalizeEditorWeightKg(6000, "lbs")).toBeCloseTo(
      toKg(6000, "lbs"),
      8,
    );
    expect(normalizeEditorWeightKg(0, "kg")).toBe(0);
  });

  it("keeps two decimal places and precise converted weights", () => {
    expect(normalizeEditorWeightKg(20.25, "kg")).toBe(20.25);
    expect(normalizeEditorWeightKg(30.15, "kg")).toBe(30.15);
    expect(normalizeEditorWeightKg(31.17, "lbs")).toBeCloseTo(
      toKg(31.17, "lbs"),
      10,
    );
  });

  it("normalizes pending values before saving without changing other sets or the original", () => {
    const draft: Exercise = {
      ...exercise,
      repsPerSet: [1000, 10, 8],
      weightsPerSetKg: [99999, 30.15, 31.17],
    };
    const saved = normalizeExerciseForSave(draft);
    expect(saved.repsPerSet).toEqual([999, 10, 8]);
    expect(saved.weightsPerSetKg).toEqual([5000, 30.15, 31.17]);
    expect(saved.reps).toBe(999);
    expect(saved.weightKg).toBe(5000);
    expect(saved.sets).toBe(3);
    expect(draft.repsPerSet).toEqual([1000, 10, 8]);
    expect(draft.weightsPerSetKg).toEqual([99999, 30.15, 31.17]);
  });

  it("preserves cleared fields for existing save validation and keeps absent weights absent", () => {
    const saved = normalizeExerciseForSave({
      ...exercise,
      repsPerSet: [0, 10, 8],
      weightsPerSetKg: [null, 0, 31.17],
    });
    expect(saved.repsPerSet).toEqual([0, 10, 8]);
    expect(saved.weightsPerSetKg).toEqual([null, 0, 31.17]);
    expect(saved.weightKg).toBeUndefined();
  });
});
