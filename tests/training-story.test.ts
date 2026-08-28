import { describe, expect, it } from "vitest";

import { trainingStoryCopy } from "../lib/training-story";

const story = {
  workoutTitle: "Training A",
  exerciseCount: 7,
  completedSets: 18,
  durationSeconds: 61 * 60,
  personalBestCount: 2,
  skippedExerciseCount: 1,
};

describe("training story copy", () => {
  it("builds the German story values", () => {
    expect(trainingStoryCopy(story, "de")).toMatchObject({
      minutes: 61,
      exerciseLabel: "Übungen",
      setLabel: "Sätze",
      bestLabel: "neue Bestleistungen",
      skippedLabel: "heute übersprungen",
    });
  });

  it("supports English and Polish stories", () => {
    expect(trainingStoryCopy(story, "en")).toMatchObject({
      exerciseLabel: "exercises",
      bestLabel: "new personal bests",
      skippedLabel: "skipped today",
    });
    expect(trainingStoryCopy(story, "pl")).toMatchObject({
      exerciseLabel: "ćwiczeń",
      bestLabel: "nowe rekordy",
      skippedLabel: "pominięto dzisiaj",
    });
  });
});
