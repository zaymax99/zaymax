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

  it("configures the signed Lock Screen widget and shared App Group", () => {
    expect(config.ios?.appleTeamId).toBe("5VY3JKR7A2");
    expect(
      config.ios?.entitlements?.["com.apple.security.application-groups"],
    ).toContain("group.com.app.zaymax");
    expect(config.plugins).toContain("@bacons/apple-targets");
  });

  it("declares the App Group UserDefaults reason without claiming data collection", () => {
    expect(
      config.ios?.privacyManifests?.NSPrivacyAccessedAPITypes,
    ).toContainEqual({
      NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
      NSPrivacyAccessedAPITypeReasons: ["1C8F.1"],
    });
    expect(config.ios?.privacyManifests?.NSPrivacyTracking).toBe(false);
    expect(config.ios?.privacyManifests?.NSPrivacyCollectedDataTypes).toEqual(
      [],
    );
  });
});
