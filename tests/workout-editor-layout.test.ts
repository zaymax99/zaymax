import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  resolve(testDirectory, "../app/workout/[id].tsx"),
  "utf8",
);

describe("workout editor layout", () => {
  it("keeps exercise cards in normal document flow", () => {
    expect(source).not.toContain("layout={Layout");
    expect(source).not.toContain("FadeInDown.delay(index");
    expect(source).toContain('width: "100%",\n        flexShrink: 0,');
  });

  it("does not collapse the set count while the value is edited", () => {
    expect(source).toContain("Math.min(20, Math.max(1, Math.floor(value)))");
    expect(source).toContain('<View style={{ width: "100%", flexShrink: 0 }}>');
  });

  it("moves exercises by stable id so rapid arrow taps cannot use stale indexes", () => {
    expect(source).toContain(
      "function moveExercise(exerciseId: string, direction: -1 | 1)",
    );
    expect(source).toContain(
      "current.findIndex((item) => item.id === exerciseId)",
    );
  });
});
