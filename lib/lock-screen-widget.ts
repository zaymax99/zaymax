import { Platform } from "react-native";

export const ZAYMAX_APP_GROUP = "group.com.app.zaymax";
export const ZAYMAX_NOTE_WIDGET_KIND = "ZaymaxPinnedNote";

const PINNED_NOTE_KEY = "zaymax.widget.pinned-note";
const EMPTY_NOTE_LABEL_KEY = "zaymax.widget.empty-label";

export type LockScreenWidgetUpdateStatus =
  | "updated"
  | "unsupported"
  | "requires-native-build";

export async function updatePinnedNoteWidget(
  note: string | undefined,
  emptyLabel: string,
): Promise<LockScreenWidgetUpdateStatus> {
  if (Platform.OS !== "ios") return "unsupported";

  try {
    const { ExtensionStorage } = await import("@bacons/apple-targets");
    const storage = new ExtensionStorage(ZAYMAX_APP_GROUP);
    const value = note?.trim() ?? "";

    storage.set(PINNED_NOTE_KEY, value);
    storage.set(EMPTY_NOTE_LABEL_KEY, emptyLabel);

    // The JS part can arrive through an OTA update before the native widget
    // module exists. Reading the value back prevents a false success state.
    const storedValue = storage.get(PINNED_NOTE_KEY) as
      | string
      | null
      | undefined;
    if (storedValue === undefined || storedValue !== value) {
      return "requires-native-build";
    }

    ExtensionStorage.reloadWidget(ZAYMAX_NOTE_WIDGET_KIND);
    return "updated";
  } catch {
    return "requires-native-build";
  }
}
