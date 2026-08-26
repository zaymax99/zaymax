import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { HEALTHKIT_CONNECTED_KEY } from "@/lib/steps";

export type ZaymaxBackup = {
  app: "Zaymax";
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
};

export async function createBackup() {
  const allKeys = await AsyncStorage.getAllKeys();
  const keys = allKeys.filter(
    (key) => key.startsWith("zaymax.") && key !== HEALTHKIT_CONNECTED_KEY,
  );
  const entries = await AsyncStorage.multiGet(keys);
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
  const parsed = JSON.parse(contents) as Partial<ZaymaxBackup>;
  if (
    parsed.app !== "Zaymax" ||
    parsed.version !== 1 ||
    !parsed.data ||
    typeof parsed.data !== "object" ||
    Object.entries(parsed.data).some(
      ([key, value]) => !key.startsWith("zaymax.") || typeof value !== "string",
    )
  ) {
    throw new Error("invalid-backup");
  }
  return parsed as ZaymaxBackup;
}

export async function restoreBackup(backup: ZaymaxBackup) {
  const currentKeys = (await AsyncStorage.getAllKeys()).filter((key) =>
    key.startsWith("zaymax."),
  );
  if (currentKeys.length) await AsyncStorage.multiRemove(currentKeys);
  const entries = Object.entries(backup.data).filter(
    ([key]) => key !== HEALTHKIT_CONNECTED_KEY,
  );
  if (entries.length) await AsyncStorage.multiSet(entries);
}
