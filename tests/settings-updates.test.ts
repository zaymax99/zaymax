import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  finishPendingSettingsUpdates,
  runSettingsUpdate,
  updateSettings,
} from "../lib/settings-updates";
import { loadSettings } from "../lib/workouts";

const storage = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage,
}));

describe("settings updates", () => {
  beforeEach(() => {
    let saved = JSON.stringify({ restSeconds: 90, weightUnit: "kg" });
    storage.getItem.mockReset().mockImplementation(async () => saved);
    storage.setItem.mockReset().mockImplementation(async (_key, value) => {
      saved = value;
    });
  });

  it("keeps both choices when rest time and unit change before storage responds", async () => {
    await Promise.all([
      updateSettings({ restSeconds: 30 }),
      updateSettings({ weightUnit: "lbs" }),
    ]);

    expect(await loadSettings()).toEqual({
      restSeconds: 30,
      weightUnit: "lbs",
    });
  });

  it("preserves the last tapped value when a setting changes rapidly", async () => {
    await Promise.all([
      updateSettings({ restSeconds: 30 }),
      updateSettings({ restSeconds: 120 }),
      updateSettings({ restSeconds: 60 }),
    ]);

    expect(await loadSettings()).toEqual({ restSeconds: 60, weightUnit: "kg" });
  });

  it("reports a failed write but still saves the following update", async () => {
    storage.setItem.mockRejectedValueOnce(new Error("storage unavailable"));
    const failed = updateSettings({ restSeconds: 30 });
    const following = updateSettings({ weightUnit: "lbs" });

    await expect(failed).rejects.toThrow("storage unavailable");
    await following;
    expect(await loadSettings()).toEqual({
      restSeconds: 90,
      weightUnit: "lbs",
    });
  });

  it("waits for pending preferences and language work before a data operation", async () => {
    const events: string[] = [];
    let release: (() => void) | undefined;
    const pending = runSettingsUpdate(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      events.push("language saved");
    });
    const drained = finishPendingSettingsUpdates().then(() => {
      events.push("data operation");
    });

    await vi.waitFor(() => expect(release).toBeDefined());
    expect(events).toEqual([]);
    release!();
    await Promise.all([pending, drained]);
    expect(events).toEqual(["language saved", "data operation"]);
  });
});
