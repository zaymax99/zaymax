import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AppLanguage } from "@/lib/i18n";

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  repsPerSet: number[];
  weightKg?: number;
  weightsPerSetKg: (number | null)[];
  note?: string;
};
export type Workout = {
  id: string;
  title: string;
  exercises: Exercise[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  lockedAt?: string;
};
export type ActiveSetValue = { reps: number; weightKg: number | null };
export type SetGains = { repsGain: number; weightGainKg: number };
export type ActiveSession = {
  workoutId: string;
  startedAt: string;
  activeElapsedSeconds: number;
  completedSets: Record<string, boolean[]>;
  setValues: Record<string, ActiveSetValue[]>;
  baselineSetValues: Record<string, ActiveSetValue[]>;
  restSeconds: number;
  restRemaining: number;
  restEndsAt?: string;
};
export type WorkoutHistorySet = {
  setNumber: number;
  reps: number;
  weightKg?: number;
  repsGain?: number;
  weightGainKg?: number;
  repsPersonalBest?: boolean;
  weightPersonalBest?: boolean;
};
export type WorkoutHistoryExercise = {
  exerciseId: string;
  name: string;
  sets: WorkoutHistorySet[];
};
export type WorkoutEffort = "leicht" | "gut" | "hart";
export type WorkoutHistoryEntry = {
  id: string;
  workoutId: string;
  workoutTitle: string;
  startedAt?: string;
  completedAt: string;
  durationSeconds?: number;
  totalVolumeKg?: number;
  completedSetCount?: number;
  improvementCount?: number;
  personalBestCount?: number;
  effort?: WorkoutEffort;
  exercises: WorkoutHistoryExercise[];
};
export type WeightUnit = "kg" | "lbs";
export type AppSettings = { restSeconds: number; weightUnit: WeightUnit };

const STORAGE_KEY = "zaymax.workouts.builder.v1";
const SESSION_KEY = "zaymax.active-session.v1";
const SETTINGS_KEY = "zaymax.settings.v1";
const HISTORY_KEY = "zaymax.workout-history.v1";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function optionalNonNegativeNumber(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function uniqueBy<T>(values: T[], keyFor: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = keyFor(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function repsForSet(
  exercise: Pick<Exercise, "reps" | "repsPerSet">,
  setIndex: number,
) {
  return exercise.repsPerSet?.[setIndex] ?? exercise.reps ?? 0;
}

export function resizeRepsPerSet(
  exercise: Pick<Exercise, "reps" | "repsPerSet">,
  sets: number,
) {
  const safeSets = Math.max(0, Math.min(20, sets));
  const fallback = exercise.repsPerSet?.at(-1) ?? exercise.reps ?? 10;
  return Array.from(
    { length: safeSets },
    (_, index) => exercise.repsPerSet?.[index] ?? fallback,
  );
}

export function weightForSet(
  exercise: Pick<Exercise, "weightKg" | "weightsPerSetKg">,
  setIndex: number,
) {
  if (
    Array.isArray(exercise.weightsPerSetKg) &&
    setIndex < exercise.weightsPerSetKg.length
  ) {
    return exercise.weightsPerSetKg[setIndex] ?? undefined;
  }
  return exercise.weightKg;
}

export function resizeWeightsPerSet(
  exercise: Pick<Exercise, "weightKg" | "weightsPerSetKg">,
  sets: number,
) {
  const safeSets = Math.max(0, Math.min(20, sets));
  const existing = Array.isArray(exercise.weightsPerSetKg)
    ? exercise.weightsPerSetKg
    : [];
  const fallback = existing.length
    ? (existing.at(-1) ?? null)
    : (exercise.weightKg ?? null);
  return Array.from({ length: safeSets }, (_, index) =>
    index < existing.length ? (existing[index] ?? null) : fallback,
  );
}

function normalizeExercise(value: unknown): Exercise | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.name !== "string"
  ) {
    return null;
  }

  const rawRepsPerSet = Array.isArray(value.repsPerSet)
    ? value.repsPerSet.map((reps) =>
        Math.max(0, Math.min(999, Math.round(finiteNumber(reps)))),
      )
    : [];
  const rawWeightsPerSet = Array.isArray(value.weightsPerSetKg)
    ? value.weightsPerSetKg.map((weight) => {
        if (weight === null || weight === undefined || weight === "")
          return null;
        const parsed = finiteNumber(weight, -1);
        return parsed >= 0 ? Math.min(5000, parsed) : null;
      })
    : [];
  const sets = Math.max(
    1,
    Math.min(
      20,
      Math.round(
        finiteNumber(
          value.sets,
          Math.max(rawRepsPerSet.length, rawWeightsPerSet.length, 1),
        ),
      ),
    ),
  );
  const reps = Math.max(
    0,
    Math.min(999, Math.round(finiteNumber(value.reps, rawRepsPerSet[0] ?? 10))),
  );
  const weight = optionalNonNegativeNumber(value.weightKg);
  const exercise: Exercise = {
    id: value.id,
    name: value.name,
    sets,
    reps,
    repsPerSet: rawRepsPerSet,
    weightKg: weight === undefined ? undefined : Math.min(5000, weight),
    weightsPerSetKg: rawWeightsPerSet,
    note: optionalString(value.note),
  };
  const repsPerSet = resizeRepsPerSet(exercise, sets);
  const weightsPerSetKg = resizeWeightsPerSet(exercise, sets);
  return {
    ...exercise,
    sets,
    reps: repsPerSet[0] ?? (Number(exercise.reps) || 0),
    repsPerSet,
    weightKg: weightsPerSetKg[0] ?? undefined,
    weightsPerSetKg,
  };
}

function normalizeWorkout(value: unknown): Workout | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.title !== "string" ||
    !Array.isArray(value.exercises)
  ) {
    return null;
  }

  const exercises = uniqueBy(
    value.exercises.flatMap((exercise) => {
      const normalized = normalizeExercise(exercise);
      return normalized ? [normalized] : [];
    }),
    (exercise) => exercise.id,
  );
  if (!exercises.length) return null;

  const now = new Date().toISOString();
  const updatedAt = optionalString(value.updatedAt) ?? now;
  return {
    id: value.id,
    title: value.title,
    exercises,
    createdAt: optionalString(value.createdAt) ?? updatedAt,
    updatedAt,
    completedAt: optionalString(value.completedAt),
    lockedAt: optionalString(value.lockedAt),
  };
}

function normalizeActiveSetValue(value: unknown): ActiveSetValue | null {
  if (!isRecord(value)) return null;
  const reps = Number(value.reps);
  const weight = value.weightKg;
  if (!Number.isFinite(reps)) return null;
  if (
    weight !== null &&
    weight !== undefined &&
    !Number.isFinite(Number(weight))
  )
    return null;
  return {
    reps: Math.max(0, Math.min(999, Math.round(reps))),
    weightKg:
      weight === null || weight === undefined
        ? null
        : Math.max(0, Math.min(5000, Number(weight))),
  };
}

function normalizeSetValueRecord(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([exerciseId, entries]) => {
      if (!Array.isArray(entries)) return [];
      const normalized = entries.slice(0, 20).flatMap((entry) => {
        const setValue = normalizeActiveSetValue(entry);
        return setValue ? [setValue] : [];
      });
      return normalized.length ? [[exerciseId, normalized]] : [];
    }),
  ) as Record<string, ActiveSetValue[]>;
}

function normalizeCompletedSetRecord(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([exerciseId, entries]) =>
      Array.isArray(entries)
        ? [[exerciseId, entries.slice(0, 20).map((entry) => entry === true)]]
        : [],
    ),
  ) as Record<string, boolean[]>;
}

function normalizeHistorySet(value: unknown): WorkoutHistorySet | null {
  if (!isRecord(value)) return null;
  const setNumber = Math.round(Number(value.setNumber));
  const reps = Math.round(Number(value.reps));
  if (!Number.isFinite(setNumber) || setNumber < 1 || !Number.isFinite(reps))
    return null;
  return {
    setNumber,
    reps: Math.max(0, reps),
    weightKg: optionalNonNegativeNumber(value.weightKg),
    repsGain: optionalNonNegativeNumber(value.repsGain),
    weightGainKg: optionalNonNegativeNumber(value.weightGainKg),
    repsPersonalBest:
      typeof value.repsPersonalBest === "boolean"
        ? value.repsPersonalBest
        : undefined,
    weightPersonalBest:
      typeof value.weightPersonalBest === "boolean"
        ? value.weightPersonalBest
        : undefined,
  };
}

function normalizeHistoryEntry(value: unknown): WorkoutHistoryEntry | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.workoutId !== "string" ||
    typeof value.workoutTitle !== "string" ||
    typeof value.completedAt !== "string" ||
    !Array.isArray(value.exercises)
  ) {
    return null;
  }

  const exercises = value.exercises.flatMap((exercise) => {
    if (
      !isRecord(exercise) ||
      typeof exercise.exerciseId !== "string" ||
      typeof exercise.name !== "string" ||
      !Array.isArray(exercise.sets)
    ) {
      return [];
    }
    return [
      {
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        sets: exercise.sets.flatMap((set) => {
          const normalized = normalizeHistorySet(set);
          return normalized ? [normalized] : [];
        }),
      },
    ];
  });
  const effort =
    value.effort === "leicht" ||
    value.effort === "gut" ||
    value.effort === "hart"
      ? value.effort
      : undefined;
  return {
    id: value.id,
    workoutId: value.workoutId,
    workoutTitle: value.workoutTitle,
    startedAt: optionalString(value.startedAt),
    completedAt: value.completedAt,
    durationSeconds: optionalNonNegativeNumber(value.durationSeconds),
    totalVolumeKg: optionalNonNegativeNumber(value.totalVolumeKg),
    completedSetCount: optionalNonNegativeNumber(value.completedSetCount),
    improvementCount: optionalNonNegativeNumber(value.improvementCount),
    personalBestCount: optionalNonNegativeNumber(value.personalBestCount),
    effort,
    exercises,
  };
}

export function setValuesForExercise(exercise: Exercise): ActiveSetValue[] {
  return Array.from({ length: exercise.sets }, (_, setIndex) => ({
    reps: repsForSet(exercise, setIndex),
    weightKg: weightForSet(exercise, setIndex) ?? null,
  }));
}

export function gainsForSet(
  value: ActiveSetValue,
  baseline: ActiveSetValue,
): SetGains {
  return {
    repsGain: Math.max(0, value.reps - baseline.reps),
    weightGainKg: Math.max(0, (value.weightKg ?? 0) - (baseline.weightKg ?? 0)),
  };
}

export function completedValuesForTemplate(
  exercise: Exercise,
  values: ActiveSetValue[],
  completed: boolean[],
) {
  const configured = setValuesForExercise(exercise);
  return values.map((value, setIndex) =>
    completed[setIndex] ? value : (configured[setIndex] ?? value),
  );
}

export async function loadWorkouts(): Promise<Workout[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return uniqueBy(
      parsed.flatMap((workout) => {
        const normalized = normalizeWorkout(workout);
        return normalized ? [normalized] : [];
      }),
      (workout) => workout.id,
    ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}
export async function saveWorkouts(entries: Workout[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
export async function loadActiveSession(): Promise<ActiveSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      !isRecord(parsed) ||
      typeof parsed.workoutId !== "string" ||
      !parsed.workoutId ||
      typeof parsed.startedAt !== "string"
    ) {
      return null;
    }
    return {
      workoutId: parsed.workoutId,
      startedAt: parsed.startedAt,
      activeElapsedSeconds: Math.max(
        0,
        Math.min(
          24 * 60 * 60,
          Math.floor(finiteNumber(parsed.activeElapsedSeconds)),
        ),
      ),
      completedSets: normalizeCompletedSetRecord(parsed.completedSets),
      setValues: normalizeSetValueRecord(parsed.setValues),
      baselineSetValues: normalizeSetValueRecord(parsed.baselineSetValues),
      restSeconds: Math.max(
        15,
        Math.min(600, Math.round(finiteNumber(parsed.restSeconds, 90))),
      ),
      restRemaining: Math.max(
        0,
        Math.min(600, Math.round(finiteNumber(parsed.restRemaining))),
      ),
      restEndsAt: optionalString(parsed.restEndsAt),
    };
  } catch {
    return null;
  }
}
export async function saveActiveSession(session: ActiveSession) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export async function clearActiveSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
export async function loadWorkoutHistory(): Promise<WorkoutHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return uniqueBy(
      parsed.flatMap((entry) => {
        const normalized = normalizeHistoryEntry(entry);
        return normalized ? [normalized] : [];
      }),
      (entry) => entry.id,
    ).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  } catch {
    return [];
  }
}
export async function saveWorkoutHistory(entries: WorkoutHistoryEntry[]) {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export async function finalizeWorkoutStorage(
  workouts: Workout[],
  history: WorkoutHistoryEntry[],
) {
  const keys = [STORAGE_KEY, HISTORY_KEY, SESSION_KEY];
  const previousEntries = await AsyncStorage.multiGet(keys);

  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEY, JSON.stringify(workouts)],
      [HISTORY_KEY, JSON.stringify(history)],
    ]);
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error) {
    try {
      await AsyncStorage.multiRemove(keys);
      const rollbackEntries = previousEntries.filter(
        (entry): entry is [string, string] => entry[1] !== null,
      );
      if (rollbackEntries.length) await AsyncStorage.multiSet(rollbackEntries);
    } catch {
      // Keep the original write error so the UI reports the useful failure.
    }
    throw error;
  }
}

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return { restSeconds: 90, weightUnit: "kg" };
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      restSeconds: Math.min(
        600,
        Math.max(15, Number(parsed.restSeconds) || 90),
      ),
      weightUnit: parsed.weightUnit === "lbs" ? "lbs" : "kg",
    };
  } catch {
    return { restSeconds: 90, weightUnit: "kg" };
  }
}
export async function saveSettings(settings: AppSettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
export function displayWeight(weightKg: number | undefined, unit: WeightUnit) {
  if (!weightKg) return "";
  const value = unit === "lbs" ? weightKg * 2.20462 : weightKg;
  return `${Number(value.toFixed(2))} ${unit}`;
}
export function toKg(value: number, unit: WeightUnit) {
  return unit === "lbs" ? value / 2.20462 : value;
}
export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
export function emptyExercise(): Exercise {
  return {
    id: uid(),
    name: "",
    sets: 3,
    reps: 10,
    repsPerSet: [10, 10, 10],
    weightsPerSetKg: [null, null, null],
  };
}
export function formatDate(date: string, locale = "de-DE") {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
export function formatDateTime(date: string, locale = "de-DE") {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}
export function exerciseSummary(
  exercise?: Exercise,
  unit: WeightUnit = "kg",
  language: AppLanguage = "de",
) {
  if (!exercise) {
    if (language === "de") return "Keine Übung";
    return language === "pl" ? "Brak ćwiczenia" : "No exercise";
  }
  const weights = resizeWeightsPerSet(exercise, exercise.sets);
  const hasWeight = weights.some(
    (weight) => typeof weight === "number" && weight > 0,
  );
  const weight = hasWeight
    ? ` · ${weights.map((value) => (value ? Number((unit === "lbs" ? value * 2.20462 : value).toFixed(2)) : "—")).join("/")} ${unit}`
    : "";
  const reps =
    exercise.repsPerSet.length && new Set(exercise.repsPerSet).size > 1
      ? exercise.repsPerSet.join("/")
      : String(repsForSet(exercise, 0));
  const setsLabel =
    language === "de" ? "Sätze" : language === "pl" ? "serie" : "sets";
  const repsLabel =
    language === "de" ? "Wdh." : language === "pl" ? "powt." : "reps";
  return `${exercise.sets} ${setsLabel} · ${reps} ${repsLabel}${weight}`;
}
