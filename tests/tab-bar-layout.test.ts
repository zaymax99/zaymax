import { describe, expect, it } from "vitest";

import { getTabBarLayout, TAB_BAR_METRICS } from "../lib/tab-bar-layout";

describe("floating tab bar geometry", () => {
  it.each([280, 320, 360, 375, 390, 430, 768, 1024])(
    "keeps equal margins and stays inside a %i-point screen",
    (screenWidth) => {
      const layout = getTabBarLayout({ screenWidth, bottomInset: 34 });
      expect(layout.left).toBeGreaterThanOrEqual(20);
      expect(layout.width).toBeLessThanOrEqual(500);
      expect(layout.left + layout.width).toBeLessThan(screenWidth);
      expect(screenWidth - layout.left - layout.width).toBeCloseTo(layout.left);
    },
  );

  it.each([0, 12, 21, 34, 48])(
    "keeps the navigation entirely above a %i-point home-indicator inset",
    (bottomInset) => {
      const layout = getTabBarLayout({ screenWidth: 390, bottomInset });
      expect(layout.bottom).toBeGreaterThanOrEqual(bottomInset);
      expect(layout.bottom).toBeGreaterThanOrEqual(8);
      expect(layout.height).toBe(56);
    },
  );

  it.each([1, 1.2, 1.5, 2, 3.1])(
    "fits both icon and scaled text at font scale %s without shrinking touch targets",
    (fontScale) => {
      const layout = getTabBarLayout({
        screenWidth: 320,
        bottomInset: 34,
        fontScale,
      });
      const touchHeight = layout.height - TAB_BAR_METRICS.rowPadding * 2;
      const contentHeight = touchHeight - TAB_BAR_METRICS.buttonPadding * 2 - 2;
      const scaledLabel =
        TAB_BAR_METRICS.labelLineHeight *
        Math.min(fontScale, TAB_BAR_METRICS.maxFontScale);

      expect(touchHeight).toBeGreaterThanOrEqual(44);
      expect(contentHeight).toBeGreaterThanOrEqual(
        TAB_BAR_METRICS.iconHeight + TAB_BAR_METRICS.contentGap + scaledLabel,
      );
      expect(layout.height).toBeLessThanOrEqual(60);
    },
  );

  it("has finite nonnegative geometry before window metrics become available", () => {
    const layout = getTabBarLayout({
      screenWidth: NaN,
      bottomInset: NaN,
      fontScale: NaN,
    });
    for (const value of Object.values(layout)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});
