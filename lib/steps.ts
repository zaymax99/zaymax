export const DAILY_STEP_GOAL = 10_000;
export const HEALTHKIT_CONNECTED_KEY = "zaymax.healthkit.steps.connected.v1";

export type StepDay = {
  date: Date;
  steps: number;
  isToday: boolean;
};

export type StepWeek = {
  days: StepDay[];
  todaySteps: number;
  totalSteps: number;
  startDate: Date;
  endDate: Date;
};

export function stepDayKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getStepWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export function buildStepWeek(
  now: Date,
  stepsByDay: ReadonlyMap<string, number> = new Map(),
): StepWeek {
  const startDate = getStepWeekStart(now);
  const todayKey = stepDayKey(now);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const storedSteps = Number(stepsByDay.get(stepDayKey(date)) ?? 0);
    const steps = Number.isFinite(storedSteps)
      ? Math.max(0, Math.round(storedSteps))
      : 0;
    return { date, steps, isToday: stepDayKey(date) === todayKey };
  });
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);

  return {
    days,
    todaySteps: days.find((day) => day.isToday)?.steps ?? 0,
    totalSteps: days.reduce((sum, day) => sum + day.steps, 0),
    startDate,
    endDate,
  };
}
