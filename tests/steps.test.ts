import { describe, expect, it } from "vitest";

import { buildStepWeek, getStepWeekStart, stepDayKey } from "../lib/steps";

describe("step week", () => {
  it("starts on Monday and contains seven days", () => {
    const now = new Date(2026, 7, 26, 12, 0, 0);
    const start = getStepWeekStart(now);
    const week = buildStepWeek(now);

    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(24);
    expect(week.days).toHaveLength(7);
    expect(week.days.map((day) => day.date.getDay())).toEqual([
      1, 2, 3, 4, 5, 6, 0,
    ]);
  });

  it("calculates today's steps and the weekly total", () => {
    const now = new Date(2026, 7, 26, 12, 0, 0);
    const steps = new Map([
      [stepDayKey(new Date(2026, 7, 24)), 4_000],
      [stepDayKey(new Date(2026, 7, 25)), 7_500],
      [stepDayKey(now), 10_250],
    ]);
    const week = buildStepWeek(now, steps);

    expect(week.todaySteps).toBe(10_250);
    expect(week.totalSteps).toBe(21_750);
  });

  it("keeps invalid HealthKit values out of charts", () => {
    const now = new Date(2026, 7, 26, 12, 0, 0);
    const week = buildStepWeek(now, new Map([[stepDayKey(now), Number.NaN]]));

    expect(week.todaySteps).toBe(0);
    expect(week.totalSteps).toBe(0);
  });
});
