import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserProfile = {
  weightKg?: number;
  heightCm?: number;
  birthDate?: string;
  onboardingCompleted: boolean;
  updatedAt?: string;
};

export type BmiLevel = "low" | "healthy" | "elevated" | "high";

export const PROFILE_STORAGE_KEY = "zaymax.profile.v1";
export const BIRTHDAY_CELEBRATION_KEY = "zaymax.birthday-celebration.v1";

const EMPTY_PROFILE: UserProfile = { onboardingCompleted: false };

export async function loadProfile(): Promise<UserProfile> {
  const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return EMPTY_PROFILE;
  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return normalizeProfile(parsed);
  } catch {
    return EMPTY_PROFILE;
  }
}

export async function saveProfile(profile: UserProfile) {
  const normalized = normalizeProfile({
    ...profile,
    updatedAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function normalizeProfile(profile: Partial<UserProfile>): UserProfile {
  const weightKg = Number(profile.weightKg);
  const heightCm = Number(profile.heightCm);
  const birthDate = isValidBirthDate(profile.birthDate)
    ? profile.birthDate
    : undefined;
  return {
    onboardingCompleted: Boolean(profile.onboardingCompleted),
    weightKg:
      Number.isFinite(weightKg) && weightKg >= 20 && weightKg <= 500
        ? Number(weightKg.toFixed(1))
        : undefined,
    heightCm:
      Number.isFinite(heightCm) && heightCm >= 80 && heightCm <= 250
        ? Number(heightCm.toFixed(1))
        : undefined,
    birthDate,
    updatedAt:
      typeof profile.updatedAt === "string" ? profile.updatedAt : undefined,
  };
}

export function parseDecimalInput(value: string) {
  const normalized = value
    .trim()
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseBirthDateInput(value: string) {
  const trimmed = value.trim();
  const germanMatch = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  if (germanMatch) {
    const [, day, month, year] = germanMatch;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidBirthDate(iso) ? iso : undefined;
  }
  return isValidBirthDate(trimmed) ? trimmed : undefined;
}

export function isValidBirthDate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  return (
    year >= 1900 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getTime() <= today.getTime()
  );
}

export function formatBirthDate(value?: string, locale = "de-DE") {
  if (!isValidBirthDate(value)) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function calculateAge(value?: string, now = new Date()) {
  if (!isValidBirthDate(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  let age = now.getFullYear() - year;
  if (
    now.getMonth() + 1 < month ||
    (now.getMonth() + 1 === month && now.getDate() < day)
  ) {
    age -= 1;
  }
  return Math.max(0, age);
}

export function calculateBmi(
  profile: Pick<UserProfile, "weightKg" | "heightCm">,
) {
  if (!profile.weightKg || !profile.heightCm) return undefined;
  const meters = profile.heightCm / 100;
  return Number((profile.weightKg / (meters * meters)).toFixed(1));
}

export function bmiLevel(bmi: number): BmiLevel {
  if (bmi < 18.5) return "low";
  if (bmi < 25) return "healthy";
  if (bmi < 30) return "elevated";
  return "high";
}

export function bmiMarkerPosition(bmi: number) {
  const minimum = 14;
  const maximum = 40;
  return Math.max(
    2,
    Math.min(98, ((bmi - minimum) / (maximum - minimum)) * 100),
  );
}

export function isBirthdayToday(value?: string, now = new Date()) {
  if (!isValidBirthDate(value)) return false;
  const [, month, day] = value.split("-").map(Number);
  return month === now.getMonth() + 1 && day === now.getDate();
}
