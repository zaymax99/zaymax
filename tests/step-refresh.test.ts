import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeToStepRefresh } from "../lib/step-refresh";

const appState = vi.hoisted(() => ({
  currentState: "active",
  addEventListener: vi.fn(),
}));

vi.mock("react-native", () => ({ AppState: appState }));

describe("steps refresh lifecycle", () => {
  let listener: (state: string) => void;
  let remove: ReturnType<typeof vi.fn>;

  function changeState(state: string) {
    appState.currentState = state;
    listener(state);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 9, 12));
    appState.currentState = "active";
    remove = vi.fn();
    appState.addEventListener
      .mockReset()
      .mockImplementation((_event, callback) => {
        listener = callback;
        return { remove };
      });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("refreshes when returning to the still-selected Steps tab", () => {
    const refresh = vi.fn();
    const unsubscribe = subscribeToStepRefresh(refresh);

    changeState("background");
    vi.advanceTimersByTime(60_000);
    expect(refresh).not.toHaveBeenCalled();
    changeState("active");
    expect(refresh).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("refreshes at local midnight, including the start of a new week", () => {
    vi.setSystemTime(new Date(2026, 8, 13, 23, 59, 59));
    const refresh = vi.fn();
    const unsubscribe = subscribeToStepRefresh(refresh);

    vi.advanceTimersByTime(999);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(new Date().getDay()).toBe(1);
    vi.advanceTimersByTime(24 * 60 * 60 * 1_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("waits for resume if midnight passes while the screen is locked", () => {
    vi.setSystemTime(new Date(2026, 8, 9, 23, 59));
    const refresh = vi.fn();
    const unsubscribe = subscribeToStepRefresh(refresh);

    changeState("inactive");
    changeState("background");
    vi.advanceTimersByTime(5 * 60_000);
    expect(refresh).not.toHaveBeenCalled();
    changeState("active");
    expect(refresh).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops refreshing and removes its listener when leaving Steps", () => {
    const refresh = vi.fn();
    const unsubscribe = subscribeToStepRefresh(refresh);
    unsubscribe();

    changeState("active");
    vi.advanceTimersByTime(48 * 60 * 60 * 1_000);
    expect(refresh).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledOnce();
  });
});
