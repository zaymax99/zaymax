import { describe, expect, it } from "vitest";

import { ZAYMAX_DESIGN } from "../constants/zaymax-design";

describe("Zaymax design tokens", () => {
  it("reserves gold for accents instead of primary action and success fills", () => {
    expect(ZAYMAX_DESIGN.colors.action).not.toBe(ZAYMAX_DESIGN.colors.gold);
    expect(ZAYMAX_DESIGN.colors.success).not.toBe(ZAYMAX_DESIGN.colors.gold);
  });

  it("keeps soft gold surfaces visually subtle", () => {
    const alpha = Number(
      ZAYMAX_DESIGN.colors.goldSoft.match(/,\s*([0-9.]+)\)$/)?.[1],
    );

    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThanOrEqual(0.08);
  });
});
