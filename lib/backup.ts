import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { HEALTHKIT_CONNECTED_KEY } from "./steps";
import {
  REMINDERS_STORAGE_KEY,
  stripLockScreenStateFromRemindersValue,
} from "./reminders";

export type ZaymaxBackup = {
  app: "Zaymax";
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseBackupContents(contents: string): ZaymaxBackup {
  const parsed = JSON.parse(contents) as unknown;
  if (
    !isRecord(parsed) ||
    parsed.app !== "Zaymax" ||
    parsed.version !== 1 ||
    typeof parsed.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(parsed.exportedAt)) ||
    !isRecord(parsed.data) ||
    Object.entries(parsed.data).some(
      ([key, value]) => !key.startsWith("zaymax.") || typeof value !== "string",
    )
  ) {
    throw new Error("invalid-backup");
  }
  return parsed as ZaymaxBackup;
}

export async function createBackup() {
  const allKeys = await AsyncStorage.getAllKeys();
  const keys = allKeys.filter(
    (key) => key.startsWith("zaymax.") && key !== HEALTHKIT_CONNECTED_KEY,
  );
  const entries = (await AsyncStorage.multiGet(keys)).map(
    ([key, value]) =>
      [
        key,
        key === REMINDERS_STORAGE_KEY && value !== null
          ? stripLockScreenStateFromRemindersValue(value)
          : value,
      ] as [string, string | null],
  );
  const backup: ZaymaxBackup = {
    app: "Zaymax",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: Object.fromEntries(
      entries.filter((entry): entry is [string, string] => entry[1] !== null),
    ),
  };
  const contents = JSON.stringify(backup, null, 2);
  const date = backup.exportedAt.slice(0, 10);
  const fileName = `zaymax-backup-${date}.json`;

  if (Platform.OS === "web") {
    const blob = new Blob([contents], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return fileName;
  }

  if (!FileSystem.documentDirectory) {
    throw new Error("backup-directory-unavailable");
  }
  const uri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, contents);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("sharing-unavailable");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    dialogTitle: "Zaymax Backup speichern",
    UTI: "public.json",
  });
  return fileName;
}

export async function pickBackup() {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const contents =
    Platform.OS === "web" && asset.file
      ? await asset.file.text()
      : await FileSystem.readAsStringAsync(asset.uri);
  return parseBackupContents(contents);
}

export async function restoreBackup(backup: ZaymaxBackup) {
  const currentKeys = (await AsyncStorage.getAllKeys()).filter((key) =>
    key.startsWith("zaymax."),
  );
  const currentEntries = currentKeys.length
    ? await AsyncStorage.multiGet(currentKeys)
    : [];
  const entries = Object.entries(backup.data)
    .filter(([key]) => key !== HEALTHKIT_CONNECTED_KEY)
    .map(
      ([key, value]) =>
        [
          key,
          key === REMINDERS_STORAGE_KEY
            ? stripLockScreenStateFromRemindersValue(value)
            : value,
        ] as [string, string],
    );
  const touchedKeys = [
    ...new Set([...currentKeys, ...entries.map(([key]) => key)]),
  ];

  try {
    if (currentKeys.length) await AsyncStorage.multiRemove(currentKeys);
    if (entries.length) await AsyncStorage.multiSet(entries);
  } catch (error) {
    try {
      if (touchedKeys.length) await AsyncStorage.multiRemove(touchedKeys);
      const rollbackEntries = currentEntries.filter(
        (entry): entry is [string, string] => entry[1] !== null,
      );
      if (rollbackEntries.length) await AsyncStorage.multiSet(rollbackEntries);
    } catch {
      // The original storage error remains the useful failure for the UI.
    }
    throw error;
  }
}
