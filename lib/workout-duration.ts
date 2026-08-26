import type { AppLanguage } from "@/lib/i18n";

const MAX_RESUMABLE_WORKOUT_MS = 12 * 60 * 60 * 1000;

export function normalizeWorkoutStartedAt(
  startedAt: string | undefined,
  openedAt: string,
) {
  if (!startedAt) return openedAt;

  const startMs = Date.parse(startedAt);
  const openedMs = Date.parse(openedAt);
  const elapsedMs = openedMs - startMs;

  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(openedMs) ||
    elapsedMs < 0 ||
    elapsedMs > MAX_RESUMABLE_WORKOUT_MS
  ) {
    return openedAt;
  }

  return startedAt;
}

export function calculateWorkoutDurationSeconds(
  startedAt: string,
  completedAt: string,
) {
  const startMs = Date.parse(startedAt);
  const completedMs = Date.parse(completedAt);

  if (!Number.isFinite(startMs) || !Number.isFinite(completedMs)) return 1;

  return Math.max(1, Math.round((completedMs - startMs) / 1000));
}

export function formatWorkoutDuration(seconds: number, language: AppLanguage) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const totalMinutes = Math.max(1, Math.round(safeSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;

  if (language === "de") return `${hours} Std. ${minutes} Min.`;
  if (language === "pl") return `${hours} godz. ${minutes} min`;
  return `${hours} hr ${minutes} min`;
}
