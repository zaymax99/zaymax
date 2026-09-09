import type { WorkoutHistoryEntry } from "./workouts";

const validSummary = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

// Older releases saved the individual sets without summary fields. Derive
// missing totals for display only; never rewrite the user's original history.
export function withHistorySummary(
  entry: WorkoutHistoryEntry,
): WorkoutHistoryEntry {
  const sets = entry.exercises.flatMap((exercise) =>
    exercise.skipped ? [] : exercise.sets,
  );
  const volume = sets.reduce((total, set) => {
    const reps = Number.isFinite(set.reps) ? Math.max(0, set.reps) : 0;
    const weight = Number.isFinite(set.weightKg)
      ? Math.max(0, set.weightKg!)
      : 0;
    return total + reps * weight;
  }, 0);
  return {
    ...entry,
    totalVolumeKg: validSummary(entry.totalVolumeKg)
      ? entry.totalVolumeKg
      : Math.round(volume * 100) / 100,
    completedSetCount: validSummary(entry.completedSetCount)
      ? entry.completedSetCount
      : sets.length,
    improvementCount: validSummary(entry.improvementCount)
      ? entry.improvementCount
      : sets.filter(
          (set) => (set.repsGain ?? 0) > 0 || (set.weightGainKg ?? 0) > 0,
        ).length,
    personalBestCount: validSummary(entry.personalBestCount)
      ? entry.personalBestCount
      : sets.reduce(
          (count, set) =>
            count +
            Number(Boolean(set.repsPersonalBest)) +
            Number(Boolean(set.weightPersonalBest)),
          0,
        ),
  };
}

export function formatHistoryVolume(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
    value,
  );
}
