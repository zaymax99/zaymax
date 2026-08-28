import { describe, expect, it } from "vitest";

import {
  calculateActiveWorkoutSeconds,
  calculateRunningWorkoutSeconds,
  calculateWorkoutDurationSeconds,
  formatWorkoutDuration,
  formatWorkoutClock,
  normalizeActiveWorkoutSeconds,
  normalizeWorkoutStartedAt,
} from "../lib/workout-duration";

describe("workout duration", () => {
  it("calculates the elapsed workout time from start to completion", () => {
    expect(
      calculateWorkoutDurationSeconds(
        "2026-08-26T18:00:00.000Z",
        "2026-08-26T19:34:42.000Z",
      ),
    ).toBe(5682);
  });

  it("formats completed workouts as hours and minutes", () => {
    expect(formatWorkoutDuration(5682, "de")).toBe("1 Std. 35 Min.");
    expect(formatWorkoutDuration(5682, "en")).toBe("1 hr 35 min");
    expect(formatWorkoutDuration(5682, "pl")).toBe("1 godz. 35 min");
    expect(formatWorkoutDuration(29 * 60, "de")).toBe("29 min");
  });

  it("starts a fresh timer when an old saved session is resumed", () => {
    const openedAt = "2026-08-26T18:00:00.000Z";

    expect(
      normalizeWorkoutStartedAt("2026-08-25T12:00:00.000Z", openedAt),
    ).toBe(openedAt);
    expect(
      normalizeWorkoutStartedAt("2026-08-26T17:30:00.000Z", openedAt),
    ).toBe("2026-08-26T17:30:00.000Z");
  });

  it("keeps legacy accumulated segments valid for stored sessions", () => {
    expect(calculateActiveWorkoutSeconds(75, 1_000, 11_999)).toBe(85);
    expect(calculateActiveWorkoutSeconds(75, null, 99_999)).toBe(75);
  });

  it("keeps counting from startedAt while the app is backgrounded", () => {
    expect(
      calculateRunningWorkoutSeconds(
        "2026-08-26T18:00:00.000Z",
        Date.parse("2026-08-26T18:42:15.000Z"),
      ),
    ).toBe(2535);
  });

  it("normalizes corrupt active time and formats the live clock", () => {
    expect(normalizeActiveWorkoutSeconds(Number.NaN)).toBe(0);
    expect(normalizeActiveWorkoutSeconds(-20)).toBe(0);
    expect(formatWorkoutClock(65)).toBe("01:05");
    expect(formatWorkoutClock(3665)).toBe("01:01:05");
  });
});
