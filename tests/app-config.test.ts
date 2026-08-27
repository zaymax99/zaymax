import { describe, expect, it } from "vitest";

import config from "../app.config";

describe("App Store iOS configuration", () => {
  it("uses the next public release version", () => {
    expect(config.version).toBe("1.0.2");
  });

  it("contains both required HealthKit purpose strings", () => {
    const infoPlist = config.ios?.infoPlist;

    expect(infoPlist?.NSHealthShareUsageDescription).toEqual(
      expect.any(String),
    );
    expect(infoPlist?.NSHealthUpdateUsageDescription).toEqual(
      expect.any(String),
    );
    expect(
      String(infoPlist?.NSHealthUpdateUsageDescription).length,
    ).toBeGreaterThan(40);
  });

  it("keeps the iOS release dark and blocks arbitrary network loads", () => {
    expect(config.userInterfaceStyle).toBe("dark");
    expect(
      config.ios?.infoPlist?.NSAppTransportSecurity?.NSAllowsArbitraryLoads,
    ).toBe(false);
  });
});
