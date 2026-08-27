import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let notificationHandlerConfigured = false;

export type LockScreenReminderCopy = {
  title: string;
  subtitle: string;
};

export type ScheduleLockScreenReminderResult =
  | { status: "scheduled"; identifier: string }
  | { status: "denied" }
  | { status: "unsupported" };

export function configureLockScreenReminderHandler() {
  if (Platform.OS !== "ios" || notificationHandlerConfigured) return;
  notificationHandlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function isNotificationPermissionGranted(
  status: Notifications.NotificationPermissionsStatus,
) {
  const iosStatus = status.ios?.status;
  return (
    status.granted ||
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

export async function scheduleLockScreenReminder(
  reminderId: string,
  text: string,
  copy: LockScreenReminderCopy,
): Promise<ScheduleLockScreenReminderResult> {
  if (Platform.OS !== "ios") return { status: "unsupported" };

  configureLockScreenReminderHandler();
  let permissions = await Notifications.getPermissionsAsync();
  if (
    !isNotificationPermissionGranted(permissions) &&
    permissions.canAskAgain
  ) {
    permissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: false,
      },
    });
  }
  if (!isNotificationPermissionGranted(permissions)) {
    return { status: "denied" };
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      subtitle: copy.subtitle,
      body: text.slice(0, 500),
      data: { type: "journal-note", reminderId },
      sound: false,
    },
    trigger: null,
  });
  return { status: "scheduled", identifier };
}

export async function dismissLockScreenReminder(identifier: string) {
  await Promise.allSettled([
    Notifications.cancelScheduledNotificationAsync(identifier),
    Notifications.dismissNotificationAsync(identifier),
  ]);
}

export async function getPresentedLockScreenReminderIds() {
  if (Platform.OS !== "ios") return new Set<string>();
  const notifications = await Notifications.getPresentedNotificationsAsync();
  return new Set(
    notifications
      .filter(
        (notification) =>
          notification.request.content.data?.type === "journal-note",
      )
      .map((notification) => notification.request.identifier),
  );
}

export async function dismissAllLockScreenReminders() {
  if (Platform.OS !== "ios") return;
  const [presented, scheduled] = await Promise.all([
    Notifications.getPresentedNotificationsAsync(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);
  const identifiers = new Set([
    ...presented
      .filter(
        (notification) =>
          notification.request.content.data?.type === "journal-note",
      )
      .map((notification) => notification.request.identifier),
    ...scheduled
      .filter(
        (notification) => notification.content.data?.type === "journal-note",
      )
      .map((notification) => notification.identifier),
  ]);
  await Promise.all(
    [...identifiers].map((identifier) => dismissLockScreenReminder(identifier)),
  );
}
