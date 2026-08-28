import type { AppLanguage } from "@/lib/i18n";

const MAX_RESUMABLE_WORKOUT_MS = 12 * 60 * 60 * 1000;
const MAX_ACTIVE_WORKOUT_SECONDS = 24 * 60 * 60;

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

export function calculateRunningWorkoutSeconds(
  startedAt: string,
  nowMs = Date.now(),
) {
  const startMs = Date.parse(startedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs)) return 0;

  return normalizeActiveWorkoutSeconds(
    Math.max(0, Math.floor((nowMs - startMs) / 1000)),
  );
}

export function normalizeActiveWorkoutSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(MAX_ACTIVE_WORKOUT_SECONDS, Math.max(0, Math.floor(value)));
}

export function calculateActiveWorkoutSeconds(
  accumulatedSeconds: number,
  activeSinceMs: number | null,
  nowMs = Date.now(),
) {
  const accumulated = normalizeActiveWorkoutSeconds(accumulatedSeconds);
  if (activeSinceMs === null || !Number.isFinite(activeSinceMs)) {
    return accumulated;
  }

  const segmentSeconds = Math.max(
    0,
    Math.floor((nowMs - activeSinceMs) / 1000),
  );
  return normalizeActiveWorkoutSeconds(accumulated + segmentSeconds);
}

export function formatWorkoutClock(seconds: number) {
  const safeSeconds = normalizeActiveWorkoutSeconds(seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  const minuteText = String(minutes).padStart(2, "0");
  const secondText = String(remainingSeconds).padStart(2, "0");

  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${minuteText}:${secondText}`
    : `${minuteText}:${secondText}`;
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
