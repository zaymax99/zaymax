import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ZAYMAX_APP_GROUP,
  ZAYMAX_NOTE_WIDGET_KIND,
  updatePinnedNoteWidget,
} from "../lib/lock-screen-widget";

const native = vi.hoisted(() => ({
  getBridge: vi.fn(),
}));
const testDirectory = dirname(fileURLToPath(import.meta.url));

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("@/native-packages/zaymax-widget-bridge", () => ({
  getZaymaxWidgetBridge: native.getBridge,
}));

describe("Lock Screen widget bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports a missing native module as requiring a new build", async () => {
    native.getBridge.mockReturnValue(null);

    await expect(
      updatePinnedNoteWidget("Training", "Notiz auswählen"),
    ).resolves.toBe("requires-native-build");
  });

  it("keeps the Swift bridge registered as an installed Apple module", () => {
    const moduleConfig = JSON.parse(
      readFileSync(
        resolve(
          testDirectory,
          "../native-packages/zaymax-widget-bridge/expo-module.config.json",
        ),
        "utf8",
      ),
    );
    const bridgePackage = JSON.parse(
      readFileSync(
        resolve(
          testDirectory,
          "../native-packages/zaymax-widget-bridge/package.json",
        ),
        "utf8",
      ),
    );
    const appPackage = JSON.parse(
      readFileSync(resolve(testDirectory, "../package.json"), "utf8"),
    );
    const podspec = readFileSync(
      resolve(
        testDirectory,
        "../native-packages/zaymax-widget-bridge/ios/ZaymaxWidgetBridge.podspec",
      ),
      "utf8",
    );

    expect(moduleConfig.platforms).toContain("apple");
    expect(moduleConfig.apple.modules).toContain("ZaymaxWidgetBridgeModule");
    expect(bridgePackage.name).toBe("zaymax-widget-bridge");
    expect(appPackage.dependencies[bridgePackage.name]).toBeUndefined();
    expect(appPackage.expo.autolinking.nativeModulesDir).toBe(
      "./native-packages",
    );
    expect(podspec).toContain("s.platforms      = { :ios => '15.1' }");
  });

  it("writes and reloads the selected note through the App Group", async () => {
    const values = new Map<string, string>();
    const bridge = {
      setString: vi.fn((key: string, value: string) => {
        values.set(key, value);
        return true;
      }),
      getString: vi.fn((key: string) => values.get(key) ?? null),
      reloadWidget: vi.fn(),
    };
    native.getBridge.mockReturnValue(bridge);

    await expect(
      updatePinnedNoteWidget("  Tasche mitnehmen  ", "Notiz auswählen"),
    ).resolves.toBe("updated");

    expect(bridge.setString).toHaveBeenCalledWith(
      "zaymax.widget.pinned-note",
      "Tasche mitnehmen",
      ZAYMAX_APP_GROUP,
    );
    expect(bridge.reloadWidget).toHaveBeenCalledWith(ZAYMAX_NOTE_WIDGET_KIND);
  });

  it("separates App Group write failures from a missing native build", async () => {
    native.getBridge.mockReturnValue({
      setString: vi.fn(() => false),
      getString: vi.fn(() => null),
      reloadWidget: vi.fn(),
    });

    await expect(
      updatePinnedNoteWidget("Training", "Notiz auswählen"),
    ).resolves.toBe("storage-unavailable");
  });
});
