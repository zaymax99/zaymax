import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ZAYMAX_APP_GROUP,
  ZAYMAX_NOTE_WIDGET_KIND,
  updatePinnedNoteWidget,
} from "../lib/lock-screen-widget";

const native = vi.hoisted(() => ({
  getBridge: vi.fn(),
}));

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("../modules/zaymax-widget-bridge", () => ({
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

  it("keeps the Swift bridge registered for iOS autolinking", () => {
    const moduleConfig = JSON.parse(
      readFileSync(
        new URL(
          "../modules/zaymax-widget-bridge/expo-module.config.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );

    expect(moduleConfig.platforms).toContain("ios");
    expect(moduleConfig.ios.modules).toContain("ZaymaxWidgetBridgeModule");
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
