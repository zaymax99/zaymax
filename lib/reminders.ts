import AsyncStorage from "@react-native-async-storage/async-storage";

export type Reminder = { id: string; text: string; createdAt: string; updatedAt: string };
export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
const STORAGE_KEY = "zaymax.reminders.v1";
const TRAINING_DAYS_KEY = "zaymax.training-days.v1";
export const reminderUid = () => `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function loadReminders(): Promise<Reminder[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.text) : []; } catch { return []; }
}

export async function saveReminders(reminders: Reminder[]) { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders)); }

export async function loadTrainingDays(): Promise<Weekday[]> {
  const raw = await AsyncStorage.getItem(TRAINING_DAYS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Weekday[];
    const valid: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    return Array.isArray(parsed) ? parsed.filter((day): day is Weekday => valid.includes(day)) : [];
  } catch { return []; }
}

export async function saveTrainingDays(days: Weekday[]) { await AsyncStorage.setItem(TRAINING_DAYS_KEY, JSON.stringify(days)); }
