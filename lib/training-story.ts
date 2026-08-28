import type { AppLanguage } from "@/lib/i18n";

export type TrainingStoryData = {
  workoutTitle: string;
  exerciseCount: number;
  completedSets: number;
  durationSeconds: number;
  personalBestCount: number;
  skippedExerciseCount: number;
};

export function trainingStoryCopy(
  data: TrainingStoryData,
  language: AppLanguage,
) {
  const minutes = Math.max(1, Math.round(data.durationSeconds / 60));

  if (language === "de") {
    return {
      eyebrow: "TRAINING ABGESCHLOSSEN",
      minutes,
      minuteLabel: "MIN",
      exerciseLabel: data.exerciseCount === 1 ? "Übung" : "Übungen",
      setLabel: data.completedSets === 1 ? "Satz" : "Sätze",
      bestLabel:
        data.personalBestCount === 1
          ? "neue Bestleistung"
          : "neue Bestleistungen",
      skippedLabel: "heute übersprungen",
    };
  }

  if (language === "pl") {
    return {
      eyebrow: "TRENING UKOŃCZONY",
      minutes,
      minuteLabel: "MIN",
      exerciseLabel: data.exerciseCount === 1 ? "ćwiczenie" : "ćwiczeń",
      setLabel: data.completedSets === 1 ? "seria" : "serii",
      bestLabel: data.personalBestCount === 1 ? "nowy rekord" : "nowe rekordy",
      skippedLabel: "pominięto dzisiaj",
    };
  }

  return {
    eyebrow: "WORKOUT COMPLETE",
    minutes,
    minuteLabel: "MIN",
    exerciseLabel: data.exerciseCount === 1 ? "exercise" : "exercises",
    setLabel: data.completedSets === 1 ? "set" : "sets",
    bestLabel:
      data.personalBestCount === 1 ? "new personal best" : "new personal bests",
    skippedLabel: "skipped today",
  };
}
