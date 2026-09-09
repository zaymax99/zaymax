import { describe, expect, it, vi } from "vitest";
import { loadSupportedGlass } from "../lib/liquid-glass";

function runtime(design = true, api = true) {
  return {
    isLiquidGlassAvailable: vi.fn(() => design),
    isGlassEffectAPIAvailable: vi.fn(() => api),
  };
}

describe("native Liquid Glass compatibility", () => {
  it.each(["web", "android"])(
    "never loads iOS native managers on %s",
    (platform) => {
      const load = vi.fn(() => runtime());
      expect(loadSupportedGlass(platform, load)).toBeNull();
      expect(load).not.toHaveBeenCalled();
    },
  );

  it("falls back safely for an installed binary without the native module", () => {
    expect(loadSupportedGlass("ios", () => null)).toBeNull();
    expect(
      loadSupportedGlass("ios", () => {
        throw new Error("Missing native module");
      }),
    ).toBeNull();
  });

  it.each([
    [false, true],
    [true, false],
    [false, false],
  ])(
    "does not use glass unless both compiler/design (%s) and runtime API (%s) support it",
    (design, api) => {
      expect(loadSupportedGlass("ios", () => runtime(design, api))).toBeNull();
    },
  );

  it("uses Apple's view only on a supported iOS build", () => {
    const supported = runtime();
    expect(loadSupportedGlass("ios", () => supported)).toBe(supported);
  });

  it("handles failed native availability queries without taking down the app", () => {
    const broken = runtime();
    broken.isGlassEffectAPIAvailable.mockImplementation(() => {
      throw new Error("Unavailable API");
    });
    expect(loadSupportedGlass("ios", () => broken)).toBeNull();
  });
});
