import { z } from "zod";
import { isValidBirthDate } from "./profile";

const id = z.string().min(1);
const date = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const optionalDate = date.nullish();
const nonNegative = z.number().finite().nonnegative();
// Older editor versions wrote values above today's UI limits. Keep these
// finite numeric payloads importable; the existing loaders apply their limits.
const reps = nonNegative.int();
const weight = nonNegative;
const setCount = z.number().int().min(1).max(20);
const uniqueIds = <T extends { id: string }>(items: T[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

// Keep optional legacy fields and unknown object metadata intact. Reject an
// invalid entry as a whole rather than silently dropping user data on import.
const exercise = z
  .object({
    id,
    name: z.string(),
    sets: setCount.optional(),
    reps: reps.optional(),
    repsPerSet: z.array(reps).max(20).optional(),
    weightKg: weight.nullish(),
    weightsPerSetKg: z.array(weight.nullable()).max(20).optional(),
    note: z.string().optional(),
  })
  .passthrough();

const workouts = z
  .array(
    z
      .object({
        id,
        title: z.string(),
        exercises: z.array(exercise).min(1).refine(uniqueIds),
        createdAt: optionalDate,
        updatedAt: optionalDate,
        completedAt: optionalDate,
        lockedAt: optionalDate,
      })
      .passthrough(),
  )
  .refine(uniqueIds);

const historySet = z
  .object({
    setNumber: z.number().int().min(1).max(20),
    reps,
    weightKg: weight.nullish(),
    repsGain: nonNegative.optional(),
    weightGainKg: nonNegative.optional(),
    repsPersonalBest: z.boolean().optional(),
    weightPersonalBest: z.boolean().optional(),
  })
  .passthrough();

const history = z
  .array(
    z
      .object({
        id,
        workoutId: id,
        workoutTitle: z.string(),
        startedAt: optionalDate,
        completedAt: date,
        durationSeconds: nonNegative.optional(),
        totalVolumeKg: nonNegative.optional(),
        completedSetCount: nonNegative.int().optional(),
        improvementCount: nonNegative.int().optional(),
        personalBestCount: nonNegative.int().optional(),
        effort: z.enum(["leicht", "gut", "hart"]).optional(),
        exercises: z.array(
          z
            .object({
              exerciseId: id,
              name: z.string(),
              skipped: z.boolean().optional(),
              sets: z.array(historySet),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
  )
  .refine(uniqueIds);

const activeValues = z.record(
  z.string(),
  z
    .array(
      z
        .object({
          reps,
          weightKg: weight.nullish(),
        })
        .passthrough(),
    )
    .max(20),
);

const session = z
  .object({
    workoutId: id,
    startedAt: date,
    activeElapsedSeconds: nonNegative.optional(),
    skippedExercises: z.record(z.string(), z.boolean()).optional(),
    completedSets: z
      .record(z.string(), z.array(z.boolean()).max(20))
      .optional(),
    setValues: activeValues.optional(),
    baselineSetValues: activeValues.optional(),
    restSeconds: z.number().finite().min(15).max(600).optional(),
    restRemaining: nonNegative.max(600).optional(),
    restEndsAt: optionalDate,
  })
  .passthrough()
  .nullable();

const birthday = z.string().refine(isValidBirthDate);
// Older notes without dates are loaded and saved with an empty date string.
const reminderDate = date.or(z.literal("")).nullish();

const schemas: Record<string, z.ZodTypeAny> = {
  "zaymax.workouts.builder.v1": workouts,
  "zaymax.workout-history.v1": history,
  "zaymax.active-session.v1": session,
  "zaymax.settings.v1": z
    .object({
      restSeconds: z.number().finite().min(15).max(600).optional(),
      weightUnit: z.enum(["kg", "lbs"]).optional(),
    })
    .passthrough(),
  "zaymax.profile.v1": z
    .object({
      weightKg: z.number().finite().min(20).max(500).optional(),
      heightCm: z.number().finite().min(80).max(250).optional(),
      birthDate: birthday.optional(),
      onboardingCompleted: z.boolean().optional(),
      updatedAt: optionalDate,
    })
    .passthrough(),
  "zaymax.reminders.v1": z
    .array(
      z
        .object({
          id,
          text: z.string().refine((value) => value.trim().length > 0),
          createdAt: reminderDate,
          updatedAt: reminderDate,
          lockScreenPinned: z.boolean().optional(),
          lockScreenNotificationId: z.string().optional(),
        })
        .passthrough(),
    )
    .refine(uniqueIds),
  "zaymax.training-days.v1": z.array(
    z.enum([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]),
  ),
};

export function isValidBackupValue(key: string, raw: string): boolean {
  // These existing storage values are plain strings, not JSON documents.
  if (key === "zaymax.language.v1") return ["de", "en", "pl"].includes(raw);
  if (key === "zaymax.healthkit.steps.connected.v1")
    return ["0", "1"].includes(raw);
  if (key === "zaymax.birthday-celebration.v1") {
    return /^\d{4}-\d{4}-\d{2}-\d{2}$/.test(raw);
  }
  const schema = schemas[key];
  if (!schema) return false;
  try {
    return schema.safeParse(JSON.parse(raw)).success;
  } catch {
    return false;
  }
}
