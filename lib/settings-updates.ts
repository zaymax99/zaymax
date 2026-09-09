import { createSerialTaskQueue } from "./serial-task-queue";
import { loadSettings, saveSettings, type AppSettings } from "./workouts";

const settingsUpdates = createSerialTaskQueue();

export function updateSettings(patch: Partial<AppSettings>) {
  return runSettingsUpdate(async () => {
    const current = await loadSettings();
    await saveSettings({ ...current, ...patch });
  });
}

export function runSettingsUpdate(task: () => Promise<void>) {
  return settingsUpdates.enqueue(task);
}

export function finishPendingSettingsUpdates() {
  return runSettingsUpdate(async () => undefined);
}
