import { describe, expect, it } from "vitest";

import { ZAYMAX_DESIGN } from "../constants/zaymax-design";

describe("Zaymax design tokens", () => {
  it("keeps the primary action neutral and reserves color for meaning", () => {
    expect(ZAYMAX_DESIGN.colors.action).not.toBe(ZAYMAX_DESIGN.colors.emerald);
    expect(ZAYMAX_DESIGN.colors.action).not.toBe(ZAYMAX_DESIGN.colors.gold);
    expect(ZAYMAX_DESIGN.colors.gold).not.toBe(ZAYMAX_DESIGN.colors.success);
  });

  it("keeps soft emerald surfaces visually subtle", () => {
    const alpha = Number(
      ZAYMAX_DESIGN.colors.emeraldSoft.match(/,\s*([0-9.]+)\)$/)?.[1],
    );

    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThanOrEqual(0.08);
  });

  it("uses translucent smoked-glass surfaces over a near-black base", () => {
    const surfaceAlpha = Number(
      ZAYMAX_DESIGN.colors.surface.match(/,\s*([0-9.]+)\)$/)?.[1],
    );
    const borderAlpha = Number(
      ZAYMAX_DESIGN.colors.border.match(/,\s*([0-9.]+)\)$/)?.[1],
    );

    expect(ZAYMAX_DESIGN.colors.background).toBe("#070707");
    expect(surfaceAlpha).toBeGreaterThanOrEqual(0.5);
    expect(surfaceAlpha).toBeLessThan(0.8);
    expect(borderAlpha).toBeGreaterThan(0);
    expect(borderAlpha).toBeLessThanOrEqual(0.16);
    expect(ZAYMAX_DESIGN.colors.action).toBe("#F7F7F8");
    expect(ZAYMAX_DESIGN.radius.card).toBeGreaterThanOrEqual(28);
    expect(ZAYMAX_DESIGN.radius.hero).toBeGreaterThan(
      ZAYMAX_DESIGN.radius.card,
    );
  });

  it("keeps interactions fast", () => {
    expect(ZAYMAX_DESIGN.motion.quick).toBeLessThanOrEqual(100);
    expect(ZAYMAX_DESIGN.motion.standard).toBeLessThanOrEqual(180);
  });
});
