import {
  resizeRepsPerSet,
  resizeWeightsPerSet,
  toKg,
  type Exercise,
  type WeightUnit,
} from "./workouts";

export function normalizeEditorReps(value: number) {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(999, Math.round(value)))
    : 0;
}

export function normalizeEditorWeightKg(
  value: number,
  unit: WeightUnit = "kg",
) {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(5000, toKg(value, unit)))
    : 0;
}

export function normalizeExerciseForSave(exercise: Exercise): Exercise {
  const repsPerSet = resizeRepsPerSet(exercise, exercise.sets).map(
    normalizeEditorReps,
  );
  const weightsPerSetKg = resizeWeightsPerSet(exercise, exercise.sets).map(
    (value) => (value === null ? null : normalizeEditorWeightKg(value)),
  );
  return {
    ...exercise,
    reps: repsPerSet[0] ?? 0,
    repsPerSet,
    weightKg: weightsPerSetKg[0] ?? undefined,
    weightsPerSetKg,
  };
}

// Keep the persisted exercise intact while the user replaces the input text.
// Both blur and save use this commit path, including save without a prior blur.
export function applySetCountDraft(
  exercise: Exercise,
  draft?: string,
): Exercise {
  if (draft === undefined || !/^\d+$/.test(draft)) return exercise;
  const value = Number(draft);
  const sets = Math.min(20, Math.max(1, Math.floor(value)));
  if (sets === exercise.sets) return exercise;
  const repsPerSet = resizeRepsPerSet(exercise, sets);
  const weightsPerSetKg = resizeWeightsPerSet(exercise, sets);
  return {
    ...exercise,
    sets,
    reps: repsPerSet[0] ?? 0,
    repsPerSet,
    weightKg: weightsPerSetKg[0] ?? undefined,
    weightsPerSetKg,
  };
}
