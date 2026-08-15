import AsyncStorage from "@react-native-async-storage/async-storage";

export type Exercise = { id: string; name: string; sets: number; reps: number; weightKg?: number; note?: string };
export type Workout = { id: string; title: string; exercises: Exercise[]; createdAt: string; updatedAt: string; completedAt?: string; archivedAt?: string };
export type ActiveSession = { workoutId: string; completedSets: Record<string, boolean[]>; restSeconds: number; restRemaining: number };
export type WeightUnit = "kg" | "lbs";
export type AppSettings = { restSeconds: number; weightUnit: WeightUnit };

const STORAGE_KEY = "zaymax.workouts.builder.v1";
const SESSION_KEY = "zaymax.active-session.v1";
const SETTINGS_KEY = "zaymax.settings.v1";

export async function loadWorkouts(): Promise<Workout[]> { const raw = await AsyncStorage.getItem(STORAGE_KEY); if (!raw) return []; try { const parsed = JSON.parse(raw) as Workout[]; return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : []; } catch { return []; } }
export async function saveWorkouts(entries: Workout[]) { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
export async function loadActiveSession(): Promise<ActiveSession | null> { const raw = await AsyncStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) as ActiveSession : null; }
export async function saveActiveSession(session: ActiveSession) { await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
export async function clearActiveSession() { await AsyncStorage.removeItem(SESSION_KEY); }
export async function loadSettings(): Promise<AppSettings> { const raw = await AsyncStorage.getItem(SETTINGS_KEY); if (!raw) return { restSeconds: 90, weightUnit: "kg" }; try { const parsed = JSON.parse(raw) as Partial<AppSettings>; return { restSeconds: Math.min(600, Math.max(15, Number(parsed.restSeconds) || 90)), weightUnit: parsed.weightUnit === "lbs" ? "lbs" : "kg" }; } catch { return { restSeconds: 90, weightUnit: "kg" }; } }
export async function saveSettings(settings: AppSettings) { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
export function displayWeight(weightKg: number | undefined, unit: WeightUnit) { if (!weightKg) return ""; const value = unit === "lbs" ? weightKg * 2.20462 : weightKg; return `${Number(value.toFixed(1))} ${unit}`; }
export function toKg(value: number, unit: WeightUnit) { return unit === "lbs" ? value / 2.20462 : value; }
export function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
export function emptyExercise(): Exercise { return { id: uid(), name: "", sets: 3, reps: 10 }; }
export function formatDate(date: string) { return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date)); }
export function exerciseSummary(exercise?: Exercise, unit: WeightUnit = "kg") { if (!exercise) return "Keine Übung"; const weight = exercise.weightKg ? ` · ${displayWeight(exercise.weightKg, unit)}` : ""; return `${exercise.sets} Sätze · ${exercise.reps} Wdh.${weight}`; }
