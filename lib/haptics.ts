import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function canUseHaptics() {
  return Platform.OS !== "web" && process.env.NODE_ENV !== "test";
}

function safelyTrigger(feedback: Promise<void>) {
  void feedback.catch(() => {
    // Haptics are an enhancement and must never block the requested action.
  });
}

export function hapticTap() {
  if (!canUseHaptics()) return;
  safelyTrigger(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticAction() {
  if (!canUseHaptics()) return;
  safelyTrigger(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticSelection() {
  if (!canUseHaptics()) return;
  safelyTrigger(Haptics.selectionAsync());
}

export function hapticSuccess() {
  if (!canUseHaptics()) return;
  safelyTrigger(
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}

export function hapticWarning() {
  if (!canUseHaptics()) return;
  safelyTrigger(
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  );
}
