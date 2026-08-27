import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadReminders } from "../lib/reminders";

const storage = vi.hoisted(() => ({
  getItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage,
}));

describe("journal storage recovery", () => {
  beforeEach(() => {
    storage.getItem.mockReset();
  });

  it("keeps valid notes and ignores malformed entries", async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify([
        {
          id: "note-1",
          text: "Nächstes Training ruhig angehen",
          createdAt: "2026-08-27T12:00:00.000Z",
          updatedAt: "2026-08-27T12:00:00.000Z",
        },
        {
          id: "note-1",
          text: "Duplicate",
          createdAt: "2026-08-27T13:00:00.000Z",
          updatedAt: "2026-08-27T13:00:00.000Z",
        },
        { id: "broken", text: 42 },
        null,
      ]),
    );

    await expect(loadReminders()).resolves.toEqual([
      {
        id: "note-1",
        text: "Nächstes Training ruhig angehen",
        createdAt: "2026-08-27T12:00:00.000Z",
        updatedAt: "2026-08-27T12:00:00.000Z",
      },
    ]);
  });

  it("returns an empty journal for invalid JSON", async () => {
    storage.getItem.mockResolvedValue("{invalid-json");

    await expect(loadReminders()).resolves.toEqual([]);
  });
});
