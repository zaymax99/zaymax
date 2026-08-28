import { existsSync, readFileSync } from "node:fs";
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
    expect(layoutSource).toContain("screenWidth - horizontalMargin * 2");
    expect(layoutSource).toContain(
      "const barLeft = Math.max((screenWidth - barWidth) / 2, horizontalMargin)",
    );
    expect(layoutSource).toContain("left: barLeft");
    expect(layoutSource).toContain("width: barWidth");
  });

  it("keeps the tab bar compact and its content clear of the home indicator", () => {
    expect(layoutSource).toContain("Math.min(insets.bottom, 10)");
    expect(layoutSource).toContain("height: 56");
    expect(layoutSource).toContain("paddingBottom: 8");
    expect(layoutSource).toContain("width: 28");
    expect(layoutSource).toContain("height: 21");
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

  it("optically aligns the transparent wordmark asset with page titles", () => {
    const wordmarkSource = readProjectFile(
      "components",
      "zaymax-wordmark.tsx",
    );
    expect(wordmarkSource).toContain("WORDMARK_LEFT_INSET");
    expect(wordmarkSource).toContain("marginLeft:");
    expect(wordmarkSource).toContain("width = 95");
  });

  it("does not render the retired round logo anywhere in the app", () => {
    for (const filename of [
      "settings.tsx",
      "privacy.tsx",
      "training-history.tsx",
      "exercise-history.tsx",
      path.join("workout", "[id].tsx"),
      path.join("workout", "active", "[id].tsx"),
    ]) {
      expect(readProjectFile("app", filename)).not.toContain(
        "ZaymaxWatermark",
      );
    }

    expect(
      existsSync(
        path.join(
          process.cwd(),
          "components",
          "zaymax-watermark.tsx",
        ),
      ),
    ).toBe(false);
  });
});
