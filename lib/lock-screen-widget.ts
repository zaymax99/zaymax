import { Platform } from "react-native";

import { getZaymaxWidgetBridge } from "../modules/zaymax-widget-bridge";

export const ZAYMAX_APP_GROUP = "group.com.app.zaymax";
export const ZAYMAX_NOTE_WIDGET_KIND = "ZaymaxPinnedNote";

const PINNED_NOTE_KEY = "zaymax.widget.pinned-note";
const EMPTY_NOTE_LABEL_KEY = "zaymax.widget.empty-label";

export type LockScreenWidgetUpdateStatus =
  | "updated"
  | "unsupported"
  | "requires-native-build"
  | "storage-unavailable";

export async function updatePinnedNoteWidget(
  note: string | undefined,
  emptyLabel: string,
): Promise<LockScreenWidgetUpdateStatus> {
  if (Platform.OS !== "ios") return "unsupported";

  const bridge = getZaymaxWidgetBridge();
  if (!bridge) return "requires-native-build";

  try {
    const value = note?.trim() ?? "";
    const wroteNote = bridge.setString(
      PINNED_NOTE_KEY,
      value,
      ZAYMAX_APP_GROUP,
    );
    const wroteLabel = bridge.setString(
      EMPTY_NOTE_LABEL_KEY,
      emptyLabel,
      ZAYMAX_APP_GROUP,
    );
    const storedValue = bridge.getString(PINNED_NOTE_KEY, ZAYMAX_APP_GROUP);

    if (!wroteNote || !wroteLabel || storedValue !== value) {
      return "storage-unavailable";
    }

    bridge.reloadWidget(ZAYMAX_NOTE_WIDGET_KIND);
    return "updated";
  } catch {
    return "storage-unavailable";
  }
}
