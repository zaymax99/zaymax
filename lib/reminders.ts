import AsyncStorage from "@react-native-async-storage/async-storage";

export type Reminder = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  lockScreenPinned?: boolean;
  lockScreenNotificationId?: string;
};
export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export const REMINDERS_STORAGE_KEY = "zaymax.reminders.v1";
const TRAINING_DAYS_KEY = "zaymax.training-days.v1";
export const reminderUid = () =>
  `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function loadReminders(): Promise<Reminder[]> {
  const raw = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    let pinnedSeen = false;
    return parsed.flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.id !== "string" ||
        !item.id ||
        typeof item.text !== "string" ||
        !item.text.trim()
      ) {
        return [];
      }
      if (seen.has(item.id)) return [];
      seen.add(item.id);
      const record = item as Partial<Reminder>;
      const createdAt =
        typeof record.createdAt === "string" ? record.createdAt : "";
      const updatedAt =
        typeof record.updatedAt === "string" ? record.updatedAt : createdAt;
      const lockScreenNotificationId =
        typeof record.lockScreenNotificationId === "string" &&
        record.lockScreenNotificationId
          ? record.lockScreenNotificationId
          : undefined;
      const lockScreenPinned = record.lockScreenPinned === true && !pinnedSeen;
      if (lockScreenPinned) pinnedSeen = true;
      return [
        {
          id: item.id,
          text: item.text,
          createdAt,
          updatedAt,
          ...(lockScreenPinned ? { lockScreenPinned: true } : {}),
          ...(lockScreenNotificationId ? { lockScreenNotificationId } : {}),
        },
      ];
    });
  } catch {
    return [];
  }
}

export async function saveReminders(reminders: Reminder[]) {
  await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
}

export function stripLockScreenStateFromRemindersValue(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return value;
    return JSON.stringify(
      parsed.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item))
          return item;
        const { lockScreenNotificationId: _legacyNotification, ...rest } =
          item as Record<string, unknown>;
        return rest;
      }),
    );
  } catch {
    return value;
  }
}

export function selectLockScreenReminder(
  reminders: Reminder[],
  reminderId: string | null,
): Reminder[] {
  return reminders.map((item) => {
    const { lockScreenNotificationId: _legacyNotification, ...clean } = item;
    return item.id === reminderId
      ? { ...clean, lockScreenPinned: true }
      : removePinnedState(clean);
  });
}

export function getPinnedLockScreenReminder(
  reminders: Reminder[],
): Reminder | undefined {
  return reminders.find((item) => item.lockScreenPinned);
}

function removePinnedState(
  reminder: Omit<Reminder, "lockScreenNotificationId">,
): Reminder {
  const { lockScreenPinned: _pinned, ...rest } = reminder;
  return rest;
}

export async function loadTrainingDays(): Promise<Weekday[]> {
  const raw = await AsyncStorage.getItem(TRAINING_DAYS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Weekday[];
    const valid: Weekday[] = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    return Array.isArray(parsed)
      ? parsed.filter((day): day is Weekday => valid.includes(day))
      : [];
  } catch {
    return [];
  }
}

export async function saveTrainingDays(days: Weekday[]) {
  await AsyncStorage.setItem(TRAINING_DAYS_KEY, JSON.stringify(days));
}
