import { AppState } from "react-native";

/** Watches only while the Steps screen is focused; it never requests Health access. */
export function subscribeToStepRefresh(refresh: () => void) {
  let stopped = false;
  let midnightTimer: ReturnType<typeof setTimeout> | undefined;

  function clearMidnightTimer() {
    if (midnightTimer !== undefined) clearTimeout(midnightTimer);
    midnightTimer = undefined;
  }

  function scheduleMidnight() {
    clearMidnightTimer();
    if (stopped || AppState.currentState !== "active") return;
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    midnightTimer = setTimeout(
      () => {
        if (stopped || AppState.currentState !== "active") return;
        refresh();
        scheduleMidnight();
      },
      Math.max(1, midnight.getTime() - now.getTime()),
    );
  }

  const subscription = AppState.addEventListener("change", (state) => {
    if (stopped) return;
    if (state === "active") {
      refresh();
      scheduleMidnight();
    } else {
      clearMidnightTimer();
    }
  });
  scheduleMidnight();

  return () => {
    stopped = true;
    clearMidnightTimer();
    subscription.remove();
  };
}
