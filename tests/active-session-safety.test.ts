import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const activeSource = readFileSync(
  join(process.cwd(), "app", "workout", "active", "[id].tsx"),
  "utf8",
);
const homeSource = readFileSync(
  join(process.cwd(), "app", "(tabs)", "index.tsx"),
  "utf8",
);

describe("active workout session safety", () => {
  it("serializes session writes and invalidates them before clear or finalize", () => {
    expect(activeSource).toMatch(/sessionWriteQueue\s*\.\s*enqueue/);
    expect(
      activeSource.match(/sessionWriteQueue\.invalidateAndDrain\(\)/g),
    ).toHaveLength(2);
    expect(activeSource).toContain(
      "if (!session || finishingRef.current || abortingRef.current) return;",
    );
  });

  it("redirects deep links and home actions to an existing active workout", () => {
    expect(activeSource).toContain(
      "existing?.workoutId && existing.workoutId !== id",
    );
    expect(homeSource).toContain(
      "activeWorkoutId && activeWorkoutId !== workout.id",
    );
    expect(homeSource).toContain("showActiveWorkoutAlert(workout)");
  });
});
