import AsyncStorage from "@react-native-async-storage/async-storage";

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  repsPerSet: number[];
  weightKg?: number;
  weightsPerSetKg: Array<number | null>;
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
  completedSets: Record<string, boolean[]>;
  setValues: Record<string, ActiveSetValue[]>;
  baselineSetValues: Record<string, ActiveSetValue[]>;
  restSeconds: number;
  restRemaining: number;
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

function normalizeExercise(exercise: Exercise): Exercise {
  const sets = Math.max(0, Math.min(20, Number(exercise.sets) || 0));
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
    const parsed = JSON.parse(raw) as Workout[];
    return Array.isArray(parsed)
      ? parsed
          .map((workout) => ({
            ...workout,
            exercises: workout.exercises.map(normalizeExercise),
          }))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : [];
  } catch {
    return [];
  }
}
export async function saveWorkouts(entries: Workout[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
export async function loadActiveSession(): Promise<ActiveSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as ActiveSession) : null;
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
    const parsed = JSON.parse(raw) as WorkoutHistoryEntry[];
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      : [];
  } catch {
    return [];
  }
}
export async function saveWorkoutHistory(entries: WorkoutHistoryEntry[]) {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
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
  return `${Number(value.toFixed(1))} ${unit}`;
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
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
export function formatDateTime(date: string, locale = "de-DE") {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
export function exerciseSummary(
  exercise?: Exercise,
  unit: WeightUnit = "kg",
  language: "de" | "en" = "de",
) {
  if (!exercise) return language === "de" ? "Keine Übung" : "No exercise";
  const weights = resizeWeightsPerSet(exercise, exercise.sets);
  const hasWeight = weights.some(
    (weight) => typeof weight === "number" && weight > 0,
  );
  const weight = hasWeight
    ? ` · ${weights.map((value) => (value ? Number((unit === "lbs" ? value * 2.20462 : value).toFixed(1)) : "—")).join("/")} ${unit}`
    : "";
  const reps =
    exercise.repsPerSet.length && new Set(exercise.repsPerSet).size > 1
      ? exercise.repsPerSet.join("/")
      : String(repsForSet(exercise, 0));
  const setsLabel = language === "de" ? "Sätze" : "sets";
  const repsLabel = language === "de" ? "Wdh." : "reps";
  return `${exercise.sets} ${setsLabel} · ${reps} ${repsLabel}${weight}`;
}
