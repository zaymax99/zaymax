import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const startupSource = fs.readFileSync(
  path.join(process.cwd(), "components", "startup-experience.tsx"),
  "utf8",
);
const activeWorkoutSource = fs.readFileSync(
  path.join(process.cwd(), "app", "workout", "active", "[id].tsx"),
  "utf8",
);

describe("startup and background workout experience", () => {
  it("ships the supplied wordmark and completes the cold-start intro in one second", () => {
    expect(
      fs.existsSync(
        path.join(process.cwd(), "assets", "images", "zaymax-wordmark.png"),
      ),
    ).toBe(true);
    expect(startupSource).toContain(
      "withDelay(100, withTiming(1, { duration: 400 }))",
    );
    expect(startupSource).toContain("withDelay(\n      500,");
    expect(startupSource).toContain("withDelay(\n      800,");
    expect(startupSource).toContain("withTiming(0, { duration: 200 }");
  });

  it("restores an active workout without replaying the intro on app resume", () => {
    expect(startupSource).toContain("loadActiveSession()");
    expect(startupSource).toContain('AppState.addEventListener("change"');
    expect(startupSource).toContain('setPhase(restored ? "done" : "intro")');
    expect(activeWorkoutSource).toContain("calculateRunningWorkoutSeconds(");
    expect(activeWorkoutSource).not.toContain("pauseWorkoutClock");
  });

  it("clears a stale session whose workout was deleted", () => {
    expect(startupSource).toContain("loadWorkouts()");
    expect(startupSource).toContain("await clearActiveSession()");
  });
});
