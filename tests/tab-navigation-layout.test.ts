import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(...segments: string[]) {
  return readFileSync(path.join(process.cwd(), ...segments), "utf8");
}

describe("tab navigation layout", () => {
  const layoutSource = readProjectFile("app", "(tabs)", "_layout.tsx");

  it("renders icon and label inside one centered custom tab button", () => {
    expect(layoutSource).toContain(
      "tabBar={(props) => <ZaymaxTabBar {...props} />}",
    );
    expect(layoutSource).toContain('alignItems: "center"');
    expect(layoutSource).toContain('textAlign: "center"');
    expect(layoutSource).not.toContain("tabBarIcon:");
  });

  it("keeps the floating bar centered with equal screen margins", () => {
    expect(layoutSource).toContain("screenWidth - 36");
    expect(layoutSource).toContain(
      "const barLeft = Math.max((screenWidth - barWidth) / 2, 18)",
    );
    expect(layoutSource).toContain("left: barLeft");
    expect(layoutSource).toContain("width: barWidth");
  });

  it("uses the shared ZAYMAX wordmark on every main tab", () => {
    for (const filename of ["index.tsx", "reminders.tsx", "steps.tsx"]) {
      const source = readProjectFile("app", "(tabs)", filename);
      expect(source).toContain("ZaymaxWordmark");
    }

    expect(readProjectFile("app", "(tabs)", "reminders.tsx")).not.toContain(
      "ZaymaxWatermark",
    );
    expect(readProjectFile("app", "(tabs)", "steps.tsx")).not.toContain(
      "ZaymaxWatermark",
    );
  });
});
