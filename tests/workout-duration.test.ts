import { describe, expect, it } from "vitest";

import {
  calculateWorkoutDurationSeconds,
  formatWorkoutDuration,
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
});
